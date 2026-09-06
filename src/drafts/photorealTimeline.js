// Paused GSAP master timeline choreography for Draft 4 Photoreal Break.
import gsap from "gsap"
import * as THREE from "three"
import { getBreakSimulation, sampleDraft2BreakState } from "./poolBreakPhysics.js"
import { TABLE_DIMS } from "./photorealGeometry.js"
import { DRAFT2_SCENE_SCALE } from "./cameraFraming.js"

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
    keyIntensity: 1.25,
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
      keyIntensity: 1.45,
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

    // Update striker (ball index 0)
    const striker = simState.balls[ 0 ]
    if ( strikerMesh && striker )
    {
      const strikerX = striker.position.x * DRAFT2_SCENE_SCALE
      const strikerZ = striker.position.z * DRAFT2_SCENE_SCALE
      strikerMesh.position.set( strikerX, striker.position.y * DRAFT2_SCENE_SCALE, strikerZ )
      strikerMesh.visible = striker.visibility
      strikerMesh.quaternion.set(
        striker.quaternion.x,
        striker.quaternion.y,
        striker.quaternion.z,
        striker.quaternion.w,
      )
      if ( contactShadows[ 0 ] )
      {
        contactShadows[ 0 ].position.set( strikerX, 0.001, strikerZ )
      }
    }

    // Update 15 object balls (indices 1 to 15 mapped to ballMeshes 0 to 14)
    simState.balls.slice( 1 ).forEach( ( ball, index ) =>
    {
      const mesh = ballMeshes[ index ]
      const shadow = contactShadows[ index + 1 ]
      if ( mesh && shadow )
      {
        const posX = ball.position.x * DRAFT2_SCENE_SCALE
        const posZ = ball.position.z * DRAFT2_SCENE_SCALE
        mesh.position.set( posX, ball.position.y * DRAFT2_SCENE_SCALE, posZ )
        mesh.visible = ball.visibility
        mesh.quaternion.set(
          ball.quaternion.x,
          ball.quaternion.y,
          ball.quaternion.z,
          ball.quaternion.w,
        )
        shadow.position.set( posX, 0.001, posZ )
        shadow.visible = ball.visibility && ball.pocketDepth < 0.25
        shadow.scale.setScalar( Math.max( 0.001, 1 - ball.pocketDepth * 4 ) )
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
