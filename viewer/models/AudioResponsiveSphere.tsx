import * as THREE from 'three';
import React, { useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { useControls } from 'leva';
import useAudioStore from '../audio/store';

const ShaderTemplateMaterial = shaderMaterial(
  {
    time: 0,
    speed: 0.349,
    distortionDepth: 0.472,
    skew: 0.217,
    fillamentSize: 0.633,
    webThickness: 0.077,
    colorA: new THREE.Color(0x2c76d6),
    colorB: new THREE.Color(0x718d83),
    duration: 1.0,
    image: null,
    scale: new THREE.Vector3(1, 1, 1),
    fadeEdgeStrength: 1.0, // Control how quickly the fade happens toward the center
    pulseStrength: 1.0, // New uniform for pulse strength
    opacity: 1.0, // New uniform for opacity
  },
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec4 vWorldPosition;
    
    uniform vec3 scale;
    uniform float fadeEdgeStrength; // Uniform to control the fade strength toward the center

    void main() {
      vUv = uv;
      vPosition = position;
      vWorldPosition = modelMatrix * vec4(position, 1.0);
      vec3 scaledPosition = (modelMatrix * vec4(position, 1.0)).xyz / scale;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
    }
  `,
  `
    precision highp float;
    precision highp int;
    
    uniform float time;
    uniform float speed;
    uniform float distortionDepth;
    uniform float skew;
    uniform float fillamentSize;
    uniform float webThickness;
    uniform vec3 colorA;
    uniform vec3 colorB;
    uniform float duration;
    uniform sampler2D image;
    uniform vec3 scale;
    uniform float fadeEdgeStrength; // Uniform to control the fade strength toward the center
    uniform float pulseStrength; // Uniform to control the pulse strength
    uniform float opacity; // Uniform for opacity

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec4 vWorldPosition;

    float f(vec3 p) {
        p.z += time * (0.5 - speed) * 10.0;
        float a = p.z * 0.3 * skew;
        p.xy *= mat2(cos(a), sin(a), -sin(a), cos(a));
        return webThickness - length(cos(p.xy) + sin(p.yz));
    }

    void main() { 
        vec4 imgColor = texture2D(image, vUv);
        vec3 d = (vWorldPosition.xyz / scale + distortionDepth * 0.5 * imgColor.rgb) * fillamentSize;
        vec3 p = vec3(0.0);
        
        // Use pulseStrength in the loop instead of any automated pulse behavior
        for (int i = 0; i < 32; i++) {
            p += f(p) * (d + imgColor.rgb * (float(i) / 32.0)) * pulseStrength;
        }
        
        float blendFactor = 0.5 + 0.5 * sin(time * 3.14159 / duration);
        vec3 blendedColor = mix(colorA, colorB, blendFactor);
        vec3 result = ((sin(p) + 12.0 * blendedColor) / length(p));
        float luminance = dot(result, vec3(0.299, 0.587, 0.114));

        // Calculate distance from the center of the viewport
        vec2 viewportCenter = vec2(0.5, 0.5);
        float distanceFromCenter = length(vUv - viewportCenter);

        // Calculate alpha based on the distance from the center and apply opacity
        float alpha = smoothstep(0.0, fadeEdgeStrength, distanceFromCenter) * opacity;

        gl_FragColor = vec4(result, alpha * luminance);    
    }
  `
);

extend({ ShaderTemplateMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      shaderTemplateMaterial: any
    }
  }
}

export const AudioResponsiveSphere: React.FC = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const amplitude = useAudioStore(state => state.amplitude)
  const { distortionDepth, skew, fillamentSize, webThickness, fadeEdgeStrength, opacity } = useControls(
    'Web 2', {
    distortionDepth: { value: 0.472, min: 0.0, max: 1.0 },
    skew: { value: 0.217, min: 0.0, max: 1.0 },
    fillamentSize: { value: 0.33, min: 0.0, max: 1.0 },
    webThickness: { value: 0.0, min: 0.0, max: 1.0 },
    fadeEdgeStrength: { value: 1.0, min: 0.1, max: 5.0 },  // Control for fade strength toward the center
    opacity: { value: 1.0, min: 0.0, max: 1.0 },  // Control for opacity
  });

  useFrame(({ clock }) => {
    if (materialRef.current && meshRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime(); // Update time uniform
      materialRef.current.uniforms.distortionDepth.value = distortionDepth;
      materialRef.current.uniforms.skew.value = skew;
      materialRef.current.uniforms.fillamentSize.value = fillamentSize;
      materialRef.current.uniforms.webThickness.value = webThickness;
      materialRef.current.uniforms.fadeEdgeStrength.value = fadeEdgeStrength; // Update fade edge strength uniform
      materialRef.current.uniforms.opacity.value = amplitude / 50; // Update opacity uniform
      
      // Get the mesh's scale and pass it to the shader
      const scale = materialRef.current.uniforms.scale.value;
      scale.copy(meshRef.current.scale);  // Copy the mesh's scale to the uniform
    }
  });

  return (
    <mesh ref={meshRef} scale={[6, 6, 6]}>
      <sphereGeometry args={[1, 32, 32]} />
      {/* @ts-expect-error - Custom r3f material type */}
      <shaderTemplateMaterial
        side={THREE.DoubleSide}
        transparent ref={materialRef} attach="material" />
    </mesh>
  );
};

export default AudioResponsiveSphere;
