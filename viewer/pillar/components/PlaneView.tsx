import { extend, ThreeEvent, useLoader, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from 'three'
import { shaderMaterial } from "@react-three/drei";
import { useContentStore } from '../../core/store/contentStore';
import { useSceneStore } from '../../scene/store';


// Extend JSX.IntrinsicElements to include fadeShaderMaterial
declare global {
  namespace JSX {
    interface IntrinsicElements {
      fadeShaderMaterial: any; // Adjust the type as necessary
    }
  }
}

export const FadeShaderMaterial = shaderMaterial(
  {
    thumbnailTexture: null,
    videoTexture: null,
    blendFactor: 0,
  },
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  uniform sampler2D thumbnailTexture;
  uniform sampler2D videoTexture;
  uniform float blendFactor;

  varying vec2 vUv;

  void main() {
    vec4 thumbnailColor = texture2D(thumbnailTexture, vUv);
    vec4 videoColor = texture2D(videoTexture, vUv);
    
    vec4 blendedColor = mix(thumbnailColor, videoColor, blendFactor);
    
    gl_FragColor = blendedColor;
  }
  `
);
extend({ FadeShaderMaterial })

interface PlaneViewProps {
  url: string
  active: boolean
  videoUrl?: string
  onClick?: (object: THREE.Object3D) => void
}

export const PlaneView = ({ url, active, videoUrl, onClick: _onClick }: PlaneViewProps) => {
  const { size: { width, height } } = useThree()

  const [imageSize, setImageSize] = useState<[number, number]>([1, 1])

  const [screenAspect, setScreenAspect] = useState<[number, number]>([1, 1])
  // Initialize imageAspect to a reasonable default (will be updated when content loads)
  const [imageAspect, setImageAspect] = useState<[number, number]>([1, 1])
  
  const viewRef = useRef<THREE.Group>(null)
  const screenRef = useRef<THREE.Mesh>(null)

  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [blendFactor, setBlendFactor] = useState(0);
  const hidePanel = true

  const [lingeringActive, setLingeringActive] = useState(active);


  useEffect(() => {
    if (active) {
      setLingeringActive(true);
    } else {
      const timer = setTimeout(() => {
        setLingeringActive(false);
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    }
  }, [active]);

  // Use callback ref to set activeItemObject synchronously and trigger fitToBox
  // This eliminates race condition where fitToBox is called before activeItemObject is set
  const setPlaneRef = useCallback((node: THREE.Mesh | null) => {
    if (node && active) {
      useContentStore.setState({ activeItemObject: node })
      // Trigger fitToBox after setting activeItemObject
      // Use requestAnimationFrame to ensure state update completes
      requestAnimationFrame(() => {
        useSceneStore.getState().fitToBox()
      })
    }
  }, [active])

  // Handle geometry updates (e.g., during browser resize)
  // When geometry dimensions change, update activeItemObject and re-trigger fitToBox
  useEffect(() => {
    if (active) {
      const activeItemObject = useContentStore.getState().activeItemObject
      if (activeItemObject && activeItemObject.geometry) {
        // Force geometry to recompute its bounding box after dimension changes
        activeItemObject.geometry.computeBoundingBox()

        // Trigger fitToBox to reframe content with updated geometry
        requestAnimationFrame(() => {
          useSceneStore.getState().fitToBox()
        })
      }
    }
  }, [active, screenAspect, imageAspect])

  // Viewport-based sizing - eliminates gaps between content
  useEffect(() => {
    const planeHeight = 1.0 // Fill the 1-unit spacing exactly
    const viewportAspect = width / height
    const planeWidth = planeHeight * viewportAspect

    setScreenAspect([planeWidth, planeHeight])
    // Don't set imageAspect here - it should be based on actual content dimensions
  }, [width, height])

  // @ts-expect-error - Type incompatibility between @react-three/fiber@8.2.2 and Three.js loader types
  const imageTexture = useLoader(
    THREE.TextureLoader,
    url,
    (loader: THREE.Loader) => {
      (loader as THREE.TextureLoader).crossOrigin = 'anonymous';
    },
    (error) => {
      console.warn('Failed to load texture:', url, error);
    }
  )

  useEffect(() => {
    if(imageTexture){
      // Calculate normalized image dimensions (max dimension = 1.0)
      let dimension = Math.max(imageTexture.image.width, imageTexture.image.height)
      let imgWidth = imageTexture.image.width / dimension
      let imgHeight = imageTexture.image.height / dimension
      setImageSize([imgWidth, imgHeight])

      // Set imageAspect to the normalized image size
      // This ensures the plane geometry matches the actual content dimensions
      setImageAspect([imgWidth, imgHeight])
    }
  }, [imageTexture])

  const onClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if(_onClick && screenRef && screenRef.current) _onClick(screenRef.current)
  },[screenRef])










  const isVideoSeeking = useContentStore(state => state.isVideoSeeking)
  const videoSeekTime = useContentStore(state => state.videoSeekTime)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      videoRef.current = node;
    }
  }, []);

  useEffect(() => {
    if (videoRef && videoRef.current && isVideoSeeking) {
      videoRef.current.pause(); // Stop playing the video
      if (isFinite(videoSeekTime) && isFinite(videoRef.current.duration)) {
        videoRef.current.currentTime = videoSeekTime * videoRef.current.duration;
      }
    } else if(videoRef && videoRef.current && !isVideoSeeking) {
      videoRef.current.play(); // Resume playing the video
    }
  },[videoRef, isVideoSeeking, videoSeekTime])

  // Handle video texture loading and aspect ratio adjustment
  useEffect(() => {
    if(!videoUrl) useContentStore.setState({ isContentVideo: false })
    if (lingeringActive && videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      const handleTimeUpdate = () => {
        if (videoRef.current && isFinite(videoRef.current.duration)) {
          useContentStore.setState({ videoSeekTime: videoRef.current.currentTime / videoRef.current.duration });
        }
      };
      video.addEventListener('timeupdate', handleTimeUpdate);

      setVideoRef(video); // Use the callback to set the ref

      const texture = new THREE.VideoTexture(video);
      setVideoTexture(texture);
      useContentStore.setState({ isContentVideo: true });

      video.play().catch((error) => {
        console.error('Video playback failed:', error);
      });

      // Update the aspect ratio and duration based on video metadata
      const handleLoadedMetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          // Calculate normalized video dimensions (max dimension = 1.0)
          const videoDimension = Math.max(video.videoWidth, video.videoHeight)
          const width = video.videoWidth / videoDimension
          const height = video.videoHeight / videoDimension
          setImageSize([width, height])

          // Set imageAspect to match video dimensions
          setImageAspect([width, height])
        }

        // Store video duration in ContentStore for VideoBar
        if (isFinite(video.duration)) {
          useContentStore.setState({ videoDuration: video.duration });
          console.log('Video metadata loaded - Duration:', video.duration);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      // Blend from thumbnail to video over 1 second
      let startTime: number | null = null;
      const fadeDuration = 1000; // 1 second

      const fadeBlend = (time: number) => {
        if (!startTime) startTime = time;
        const elapsed = time - startTime;

        const newBlendFactor = Math.min(elapsed / fadeDuration, 1);
        setBlendFactor(newBlendFactor);

        if (newBlendFactor < 1) {
          requestAnimationFrame(fadeBlend); // Continue animation until fully blended
        }
      };

      requestAnimationFrame(fadeBlend);

      return () => {
        video.pause();
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        videoTexture?.dispose();
        setVideoRef(null); // Clear the video ref
        useContentStore.setState({ videoDuration: 0 }); // Reset duration
        useContentStore.setState({ isContentVideo: false }); // Reset video flag
      }
    } else {
      setBlendFactor(0) // Reset blend factor
      setVideoTexture(null) // Reset video texture
      useContentStore.setState({ videoDuration: 0 }); // Reset duration when not active
    }
  }, [lingeringActive, videoUrl]);















  return (
    <group ref={viewRef}>
      <mesh ref={screenRef} onClick={onClick}>
        <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
        {hidePanel ? <meshBasicMaterial transparent opacity={0} visible={false} /> :
        <meshBasicMaterial color={active ? "hotpink" : "black"} transparent opacity={.5} /> }
      </mesh>

      <mesh ref={setPlaneRef} position={[0, 0, 0.001]}>
        <planeGeometry args={[imageAspect[0], imageAspect[1]]} />
        <fadeShaderMaterial
          attach="material"
          thumbnailTexture={imageTexture}
          videoTexture={videoTexture}
          blendFactor={blendFactor}
          toneMapped={false}
          // side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
