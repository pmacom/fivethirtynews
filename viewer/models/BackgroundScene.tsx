import React, { useEffect } from 'react'
import { FaceControls, Facemesh, FaceLandmarker, OrbitControls, useFaceLandmarker } from "@react-three/drei";
import { DoubleSide } from 'three'
import Logo532 from './Logo532';

export const BackgroundScene = () => {
    const scale = 2
    return (
        <group scale={scale}>
            <Logo532 />
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