// Paused GSAP master timeline choreography for Draft 5 Photoreal Break.
import gsap from "gsap"
import * as THREE from "three"
import { getBreakSimulation, sampleDraft2BreakState } from "./poolBreakPhysics.js"
import { TABLE_DIMS } from "./photorealGeometry.js"

const BALL_RADIUS = TABLE_DIMS.ballRadius

export const BEAT_PROGRESS = Object.freeze( {
  establish: 0.0,
  approach: 0.08,
  impact: 0.25,
  break: 0.35,
  settle: 0.72,
  exit: 0.90,
} )

export const createPhotorealChoreography = ( {
  camera,
  cueStick,
  strikerMesh,
  ballMeshes,
  contactShadows,
  keyLight,
} ) =>
{
  const simulation = getBreakSimulation()
  const qTmp = new THREE.Quaternion()
  const vTmp = new THREE.Vector3()

  // Trackable animated proxy object for GSAP timeline
  const proxy = {
    cueZ: 0,
    cueOpacity: 1,
    cameraFov: 40,
    keyIntensity: 1.85,
    storyProgress: 0,
  }

  const timeline = gsap.timeline( {
    paused: true,
    defaults: { ease: "power2.inOut" },
  } )

  // Timeline spanning normalized progress 0 to 1
  timeline
    .addLabel( "establish", 0.0 )
    .to( proxy, {
      keyIntensity: 2.1,
      duration: 0.08,
      ease: "power1.out",
    }, 0.0 )

    // Approach: Cue stick draws back into strike readiness
    .addLabel( "approach", 0.08 )
    .fromTo( proxy, { cueZ: 0.2 }, {
      cueZ: 1.6,
      duration: 0.16,
      ease: "power2.in",
    }, 0.08 )

    // Strike / Impact: Cue fires forward striking cue ball at 0.25, then brief physical recoil
    .addLabel( "impact", 0.24 )
    .to( proxy, {
      cueZ: -0.15,
      duration: 0.02,
      ease: "none",
    }, 0.24 )
    .to( proxy, {
      cueZ: 0.45,
      duration: 0.08,
      ease: "power2.out",
    }, 0.26 )
    .to( proxy, {
      cueOpacity: 0,
      duration: 0.06,
      ease: "power1.in",
    }, 0.34 )

    // Break & Settle
    .addLabel( "break", 0.35 )
    .addLabel( "settle", 0.72 )
    .addLabel( "exit", 0.90 )

  const seek = ( progress ) =>
  {
    const clampedProgress = Math.min( 1, Math.max( 0, progress ) )
    proxy.storyProgress = clampedProgress
    timeline.seek( clampedProgress, false )

    // Update cue stick physical position & visibility
    if ( cueStick )
    {
      cueStick.position.set( 0, BALL_RADIUS + 0.08, 6.2 + proxy.cueZ )
      cueStick.rotation.x = 0.08
      cueStick.visible = clampedProgress < 0.42
    }

    // Update key light intensity
    if ( keyLight )
    {
      keyLight.intensity = proxy.keyIntensity
    }

    // Deterministic ball simulation synchronized with Story progress
    const simState = sampleDraft2BreakState( clampedProgress, simulation )

    // Update striker
    if ( strikerMesh && simState.striker )
    {
      strikerMesh.position.set( simState.striker.x, BALL_RADIUS, simState.striker.z )
      strikerMesh.quaternion.copy( simState.striker.quaternion )
      if ( contactShadows[ 0 ] )
      {
        contactShadows[ 0 ].position.set( simState.striker.x, 0.001, simState.striker.z )
      }
    }

    // Update rack balls
    simState.balls.forEach( ( ball, index ) =>
    {
      const mesh = ballMeshes[ index ]
      const shadow = contactShadows[ index + 1 ]
      if ( mesh && shadow )
      {
        mesh.position.set( ball.x, BALL_RADIUS, ball.z )
        mesh.quaternion.copy( ball.quaternion )
        shadow.position.set( ball.x, 0.001, ball.z )
      }
    } )

    let phase = "ESTABLISH"
    if ( clampedProgress >= 0.90 ) phase = "EXIT / STUDIO"
    else if ( clampedProgress >= 0.72 ) phase = "SETTLE"
    else if ( clampedProgress >= 0.35 ) phase = "BREAK / SCATTER"
    else if ( clampedProgress >= 0.24 ) phase = "IMPACT"
    else if ( clampedProgress >= 0.08 ) phase = "APPROACH"

    return { phase, progress: clampedProgress }
  }

  const dispose = () =>
  {
    timeline.kill()
  }

  return {
    timeline,
    seek,
    dispose,
  }
}
