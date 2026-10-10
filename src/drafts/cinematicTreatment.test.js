import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { resolveIntroCameraFraming } from './cameraFraming.js'

const desktop = { width: 1280, height: 800, devicePixelRatio: 2, deviceMemory: 8, hardwareConcurrency: 8, coarsePointer: false, isSmallViewport: false, lowPower: false }
test('explicit camera treatments leave the aligned and photo-locked contracts intact', () => {
 for(const progress of [0,.15,.3,.5,1]) {
  const options={progress,aspect:1.6}
  assert.deepEqual(resolveIntroCameraFraming(options),resolveIntroCameraFraming({...options,treatment:'aligned'}))
  const locked=resolveIntroCameraFraming({...options,lockToPlate:true})
  for(const treatment of ['break']) {
   assert.deepEqual(locked,resolveIntroCameraFraming({...options,treatment,lockToPlate:true}))
   assert.notDeepEqual(resolveIntroCameraFraming(options).camera,resolveIntroCameraFraming({...options,treatment}).camera)
  }
 }
})
test('camera treatments hold scatter composition and reverse deterministically', () => {
 for(const treatment of ['break']) {
  const resolve=progress=>resolveIntroCameraFraming({treatment,progress,aspect:1.6})
  assert.deepEqual(resolve(.35).camera,resolve(.48).camera)
  const opening=resolve(0);resolve(1);assert.deepEqual(opening,resolve(0))
 }
})
test('portrait opening keeps foreground and rack below headline and inside viewport', () => {
 for(const treatment of ['break']) {
  const frame=resolveIntroCameraFraming({treatment,aspect:390/844})
  const camera=new THREE.PerspectiveCamera(frame.fov,390/844,.1,80)
  camera.position.set(...frame.camera);camera.lookAt(...frame.target);camera.updateMatrixWorld(true)
  for(const [x,z] of [[0,3.78],[0,-4.9],[-.54,-5.8],[.54,-5.8]]) {
   const p=new THREE.Vector3(x,.265,z).project(camera)
   assert.ok(Math.abs(p.x)<.92,`${treatment} horizontal ${p.x}`)
   assert.ok(p.y<.05 && p.y>-.92,`${treatment} vertical ${p.y}`)
  }
 }
})
