import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { resolveIntroCameraFraming } from './cameraFraming.js'
import { createApronGeometry, createSlateGeometry, POCKET_COORDS } from './photorealGeometry.js'
import { createQualityMonitor, selectPoolQualityTier } from './renderQuality.js'

const desktop = { width: 1280, height: 800, devicePixelRatio: 2, deviceMemory: 8, hardwareConcurrency: 8, coarsePointer: false, isSmallViewport: false, lowPower: false }
test('explicit camera treatments leave the aligned and photo-locked contracts intact', () => {
 for(const progress of [0,.15,.3,.5,1]) {
  const options={progress,aspect:1.6}
  assert.deepEqual(resolveIntroCameraFraming(options),resolveIntroCameraFraming({...options,treatment:'aligned'}))
  const locked=resolveIntroCameraFraming({...options,lockToPlate:true})
  for(const treatment of ['break','photoreal']) {
   assert.deepEqual(locked,resolveIntroCameraFraming({...options,treatment,lockToPlate:true}))
   assert.notDeepEqual(resolveIntroCameraFraming(options).camera,resolveIntroCameraFraming({...options,treatment}).camera)
  }
 }
})
test('camera treatments hold scatter composition and reverse deterministically', () => {
 for(const treatment of ['break','photoreal']) {
  const resolve=progress=>resolveIntroCameraFraming({treatment,progress,aspect:1.6})
  assert.deepEqual(resolve(.35).camera,resolve(.48).camera)
  const opening=resolve(0);resolve(1);assert.deepEqual(opening,resolve(0))
 }
})
test('portrait opening keeps foreground and rack below headline and inside viewport', () => {
 for(const treatment of ['break','photoreal']) {
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
test('quality changes wait for settlement and low-power devices never promote', () => {
 const applied=[];const monitor=createQualityMonitor('standard',desktop,id=>applied.push(id))
 for(let i=0;i<24;i++)monitor.observe(50,false)
 assert.equal(monitor.current,'standard');assert.equal(monitor.pending,true)
 assert.equal(monitor.observe(50,true),true);assert.deepEqual(applied,['low'])
 monitor.suggestFromSignals({...desktop,isSmallViewport:true})
 for(let i=0;i<80;i++)monitor.observe(1,true)
 assert.equal(monitor.current,'low')
 assert.equal(selectPoolQualityTier({...desktop,coarsePointer:true}),'low')
})
test('slate and apron leave all six pocket centers open through their depth', () => {
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide})
 for(const geometry of [createSlateGeometry(),createApronGeometry()]) {
  const mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld(true)
  for(const [x,z] of POCKET_COORDS) {
   for(let i=0;i<16;i++) {
    const angle=i*Math.PI/8
    const ray=new THREE.Raycaster(new THREE.Vector3(x+Math.cos(angle)*.39,2,z+Math.sin(angle)*.39),new THREE.Vector3(0,-1,0))
    assert.equal(ray.intersectObject(mesh).length,0,`blocked pocket ${x},${z}`)
   }
  }
  geometry.dispose()
 }
 material.dispose()
})
test('felt UVs use the same normalized table scale',()=>{
 const geometry=createSlateGeometry();const uv=geometry.attributes.uv
 for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>=-1e-6&&uv.getX(i)<=1+1e-6);assert.ok(uv.getY(i)>=-1e-6&&uv.getY(i)<=1+1e-6)}
 geometry.dispose()
})
