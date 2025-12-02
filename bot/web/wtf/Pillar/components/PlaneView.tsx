import { extend, ThreeEvent, useLoader, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from 'three'
import { shaderMaterial } from "@react-three/drei";
import { ContentStore } from "../../Content/contentStore";
import { useStoreValue } from 'zustand-x';


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
  const [imageAspect, setImageAspect] = useState<[number, number]>([1, 1])
  
  const viewRef = useRef<THREE.Group>(null)
  const screenRef = useRef<THREE.Mesh>(null)
  const planeRef = useRef<THREE.Mesh>(null)

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

  useEffect(() => {
    const maxWindowDimension = Math.max(width, height)
    const windowWidth = width / maxWindowDimension
    const windowHeight = height / maxWindowDimension
    let imageWidth = imageSize[0]
    let imageHeight = imageSize[1]
    const aspect = imageWidth / imageHeight

    if (windowHeight < imageHeight) {
      imageHeight = windowHeight
      imageWidth = windowHeight * aspect
    }
    if (windowWidth < imageWidth) {
      imageWidth = windowWidth
      imageHeight = windowWidth / aspect
    }
    setScreenAspect([windowWidth, windowHeight])
    setImageAspect([imageWidth, imageHeight])
  }, [width, height, imageSize])

  const imageTexture = useLoader(THREE.TextureLoader, url, (loader: THREE.Loader) => {
    (loader as THREE.TextureLoader).crossOrigin = 'anonymous';
  })

  useEffect(() => {
    if(imageTexture){
      const dimension = Math.max(imageTexture.image.width, imageTexture.image.height)
      const width = imageTexture.image.width / dimension
      const height = imageTexture.image.height / dimension
      setImageSize([width, height])
    }
  }, [imageTexture])

  const onClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if(_onClick && screenRef && screenRef.current) _onClick(screenRef.current)
  }, [_onClick, screenRef])










  const isVideoSeeking = useStoreValue(ContentStore, 'isVideoSeeking')
  const videoSeekTime = useStoreValue(ContentStore, 'videoSeekTime')
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
    if(!videoUrl) ContentStore.set('isContentVideo', false)
    if (lingeringActive && videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      const handleTimeUpdate = () => {
        if (videoRef.current) {
          ContentStore.set('videoSeekTime', videoRef.current.currentTime / videoRef.current.duration);
        }
      };
      video.addEventListener('timeupdate', handleTimeUpdate);

      setVideoRef(video); // Use the callback to set the ref

      const texture = new THREE.VideoTexture(video);
      setVideoTexture(texture);
      ContentStore.set('isContentVideo', true);

      video.play().catch((error) => {
        console.error('Video playback failed:', error);
      });

      // Update the aspect ratio based on video dimensions once metadata is loaded
      const handleLoadedMetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          const videoDimension = Math.max(video.videoWidth, video.videoHeight)
          const width = video.videoWidth / videoDimension
          const height = video.videoHeight / videoDimension
          setImageSize([width, height])
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
      }
    } else {
      setBlendFactor(0) // Reset blend factor
      setVideoTexture(null) // Reset video texture
    }
  }, [lingeringActive, videoUrl, setVideoRef, videoTexture]);















  return (
    <group ref={viewRef}>
      <mesh ref={screenRef} onClick={onClick}>
        <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
        {hidePanel ? <meshBasicMaterial transparent opacity={0} visible={false} /> :
        <meshBasicMaterial color={active ? "hotpink" : "black"} transparent opacity={.5} /> }
      </mesh>

      <mesh ref={planeRef} position={[0, 0, 0.001]}>
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
