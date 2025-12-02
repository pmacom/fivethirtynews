import React, { useEffect } from 'react'
import { FaceControls, Facemesh, FaceLandmarker, OrbitControls, useFaceLandmarker } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { DoubleSide } from 'three'

export const BackgroundScene = () => {
    const scale = 2
    return (
        <group scale={scale}>
            <FaceLandmarker>
                <Facemesh />
                {/* <FaceControls
                    autostart
                    webcam
                /> */}
            </FaceLandmarker>


                <directionalLight />
    
            <mesh position={[1, 1, -10]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="hotpink" />
            </mesh>
        </group>
    )
}

const Face = () => {
    // const points = useFaceLandmarker()

    // useEffect(() => {
    //     console.log(points)
    // }, [points])

    return (
        <Facemesh >
            <meshStandardMaterial side={DoubleSide} color="orange" />
        </Facemesh>
    )
}

export default BackgroundScene