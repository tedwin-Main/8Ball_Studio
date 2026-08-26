// This module has no DOM or renderer dependency, so the cached break can be tested in Node.

const clamp = ( value, min = 0, max = 1 ) => Math.min( max, Math.max( min, value ) )
const lerp = ( start, end, progress ) => start + ( end - start ) * progress
const smoothstep = ( progress ) => progress * progress * ( 3 - 2 * progress )
const EPSILON = 1e-9
const CONTACT_EPSILON = 2e-6

// Hold the break on screen long enough for the slower, heavier spread to read before the cut.
export const CINEMATIC_EXIT_START = 0.5
export const CINEMATIC_EXIT_END = 0.9

// SI-unit defaults keep the deterministic break physically consistent with the rendered table.
export const DEFAULT_BREAK_CONFIG = Object.freeze( {
  timestep: 1 / 240,
  duration: 3,
  // Extra contact passes keep the tightly packed rack from separating in one visible jump.
  collisionIterations: 16,
  gravity: 9.81,
  ball: Object.freeze( {
    mass: 0.17,
    // A 35 mm radius gives every ball stronger POV presence; the nearby 8-ball grows naturally through perspective.
    radius: 0.035,
    restitution: 0.84,
    friction: 0.03,
    slidingFriction: 0.24,
    rollingDeceleration: 0.28,
  } ),
  table: Object.freeze( {
    width: 1.27,
    length: 2.54,
    cushionRestitution: 0.72,
    cornerPocketRadius: 0.068,
    sidePocketRadius: 0.061,
  } ),
  rack: Object.freeze( {
    apexX: 0,
    // Place the rack near the foot rail to match a real down-table break composition.
    apexZ: -0.9,
    gap: 0.00004,
  } ),
  striker: Object.freeze( {
    startX: -0.005,
    startZ: 0.5,
    impactOffsetX: -0.0034,
    // The heavier striker still follows through, but lower launch energy keeps the rack from darting away.
    massMultiplier: 2.3,
    launchSpeed: 5.2,
  } ),
  milestone: Object.freeze( {
    minimumTime: 1.6,
    maximumTime: 2.6,
    ballsOutsideRack: 12,
    rmsBallDiameters: 8,
  } ),
} )

const mergeConfig = ( config = {} ) => ( {
  ...DEFAULT_BREAK_CONFIG,
  ...config,
  ball: { ...DEFAULT_BREAK_CONFIG.ball, ...config.ball },
  table: { ...DEFAULT_BREAK_CONFIG.table, ...config.table },
  rack: { ...DEFAULT_BREAK_CONFIG.rack, ...config.rack },
  striker: { ...DEFAULT_BREAK_CONFIG.striker, ...config.striker },
  milestone: { ...DEFAULT_BREAK_CONFIG.milestone, ...config.milestone },
} )

const freezeDeep = ( value ) =>
{
  if ( !value || typeof value !== 'object' || Object.isFrozen( value ) ) return value
  Object.values( value ).forEach( freezeDeep )
  return Object.freeze( value )
}

const magnitude2 = ( x, z ) => Math.hypot( x, z )

const normalize2 = ( x, z, fallbackX = 1, fallbackZ = 0 ) =>
{
  const length = magnitude2( x, z )
  if ( length <= EPSILON ) return { x: fallbackX, z: fallbackZ }
  return { x: x / length, z: z / length }
}

const multiplyQuaternion = ( left, right ) => ( {
  x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
  y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
  z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
  w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
} )

const normalizeQuaternion = ( quaternion ) =>
{
  const length = Math.hypot(
    quaternion.x,
    quaternion.y,
    quaternion.z,
    quaternion.w,
  ) || 1
  quaternion.x /= length
  quaternion.y /= length
  quaternion.z /= length
  quaternion.w /= length
}

// World-space angular velocity is premultiplied so scroll playback matches real rolling axes.
const integrateQuaternion = ( quaternion, angularVelocity, duration ) =>
{
  const speed = Math.hypot( angularVelocity.x, angularVelocity.y, angularVelocity.z )
  if ( speed <= EPSILON || duration <= 0 ) return

  const halfAngle = speed * duration * 0.5
  const scale = Math.sin( halfAngle ) / speed
  const delta = {
    x: angularVelocity.x * scale,
    y: angularVelocity.y * scale,
    z: angularVelocity.z * scale,
    w: Math.cos( halfAngle ),
  }
  const result = multiplyQuaternion( delta, quaternion )
  Object.assign( quaternion, result )
  normalizeQuaternion( quaternion )
}

const quaternionFromAxisAngle = ( axisX, axisY, axisZ, angle ) =>
{
  const axis = normalize2( axisX, axisZ, 1, 0 )
  const halfAngle = angle * 0.5
  const sin = Math.sin( halfAngle )
  return {
    x: axis.x * sin,
    y: axisY * sin,
    z: axis.z * sin,
    w: Math.cos( halfAngle ),
  }
}

const kineticEnergy = ( ball, config ) =>
{
  const { radius } = config.ball
  const mass = ball.mass ?? config.ball.mass
  const inertia = ( 2 / 5 ) * mass * radius * radius
  const linear = 0.5 * mass * ( ball.vx * ball.vx + ball.vz * ball.vz )
  const angular = 0.5 * inertia * (
    ball.wx * ball.wx + ball.wy * ball.wy + ball.wz * ball.wz
  )
  return linear + angular
}

// Numerical guards scale only the colliding bodies if floating-point error adds energy.
const capEnergy = ( balls, beforeEnergy, config ) =>
{
  const afterEnergy = balls.reduce( ( total, ball ) => total + kineticEnergy( ball, config ), 0 )
  if ( afterEnergy <= beforeEnergy + 1e-10 || afterEnergy <= EPSILON ) return 0

  const scale = Math.sqrt( beforeEnergy / afterEnergy )
  balls.forEach( ( ball ) =>
  {
    ball.vx *= scale
    ball.vz *= scale
    ball.wx *= scale
    ball.wy *= scale
    ball.wz *= scale
  } )
  return afterEnergy - beforeEnergy
}

const createRackPositions = ( config ) =>
{
  const { radius } = config.ball
  const spacing = radius * 2 + config.rack.gap
  const rowSpacing = spacing * Math.sqrt( 3 ) / 2
  const positions = []

  for ( let row = 0; row < 5; row += 1 )
  {
    for ( let column = 0; column <= row; column += 1 )
    {
      positions.push( {
        x: config.rack.apexX + ( column - row / 2 ) * spacing,
        z: config.rack.apexZ - row * rowSpacing,
      } )
    }
  }

  return positions
}

const createTableGeometry = ( config ) =>
{
  const halfWidth = config.table.width / 2
  const halfLength = config.table.length / 2
  const cornerGap = config.table.cornerPocketRadius * 1.72
  const sideGap = config.table.sidePocketRadius * 1.35
  const jawOutset = config.ball.radius * 1.25
  const segments = []

  const addSegment = ( ax, az, bx, bz, type = 'cushion' ) =>
  {
    segments.push( { ax, az, bx, bz, type } )
  }

  // Straight cushion runs stop before each pocket mouth.
  addSegment( -halfWidth + cornerGap, -halfLength, halfWidth - cornerGap, -halfLength )
  addSegment( -halfWidth + cornerGap, halfLength, halfWidth - cornerGap, halfLength )
  addSegment( -halfWidth, -halfLength + cornerGap, -halfWidth, -sideGap )
  addSegment( -halfWidth, sideGap, -halfWidth, halfLength - cornerGap )
  addSegment( halfWidth, -halfLength + cornerGap, halfWidth, -sideGap )
  addSegment( halfWidth, sideGap, halfWidth, halfLength - cornerGap )

    // Short angled jaws guide valid trajectories into open throats instead of closing each gap.
    ;[ -1, 1 ].forEach( ( xSign ) =>
    {
      ;[ -1, 1 ].forEach( ( zSign ) =>
      {
        addSegment(
          xSign * ( halfWidth - cornerGap ),
          zSign * halfLength,
          xSign * ( halfWidth - cornerGap * 0.43 ),
          zSign * ( halfLength + jawOutset ),
          'corner-jaw',
        )
        addSegment(
          xSign * halfWidth,
          zSign * ( halfLength - cornerGap ),
          xSign * ( halfWidth + jawOutset ),
          zSign * ( halfLength - cornerGap * 0.43 ),
          'corner-jaw',
        )
      } )

      addSegment(
        xSign * halfWidth,
        -sideGap,
        xSign * ( halfWidth + jawOutset ),
        -sideGap * 0.38,
        'side-jaw',
      )
      addSegment(
        xSign * halfWidth,
        sideGap,
        xSign * ( halfWidth + jawOutset ),
        sideGap * 0.38,
        'side-jaw',
      )
    } )

  const pockets = [
    { x: -halfWidth - 0.006, z: -halfLength - 0.006, radius: config.table.cornerPocketRadius },
    { x: halfWidth + 0.006, z: -halfLength - 0.006, radius: config.table.cornerPocketRadius },
    { x: -halfWidth - 0.008, z: 0, radius: config.table.sidePocketRadius },
    { x: halfWidth + 0.008, z: 0, radius: config.table.sidePocketRadius },
    { x: -halfWidth - 0.006, z: halfLength + 0.006, radius: config.table.cornerPocketRadius },
    { x: halfWidth + 0.006, z: halfLength + 0.006, radius: config.table.cornerPocketRadius },
  ]

  return { segments, pockets, halfWidth, halfLength }
}

const sweepCircleCircle = ( first, second, diameter, maximumTime ) =>
{
  const px = second.x - first.x
  const pz = second.z - first.z
  const vx = second.vx - first.vx
  const vz = second.vz - first.vz
  const distanceTerm = px * px + pz * pz - diameter * diameter
  const closing = px * vx + pz * vz

  if ( distanceTerm <= CONTACT_EPSILON * diameter )
  {
    return closing < -EPSILON ? 0 : null
  }

  const speedSquared = vx * vx + vz * vz
  if ( speedSquared <= EPSILON || closing >= 0 ) return null

  const discriminant = closing * closing - speedSquared * distanceTerm
  if ( discriminant < 0 ) return null

  const time = ( -closing - Math.sqrt( discriminant ) ) / speedSquared
  return time >= -EPSILON && time <= maximumTime + EPSILON ? Math.max( 0, time ) : null
}

const sweepPointCircle = ( ball, centerX, centerZ, radius, maximumTime ) =>
{
  const px = ball.x - centerX
  const pz = ball.z - centerZ
  const distanceTerm = px * px + pz * pz - radius * radius
  if ( distanceTerm <= 0 ) return 0

  const speedSquared = ball.vx * ball.vx + ball.vz * ball.vz
  const direction = px * ball.vx + pz * ball.vz
  if ( speedSquared <= EPSILON || direction >= 0 ) return null

  const discriminant = direction * direction - speedSquared * distanceTerm
  if ( discriminant < 0 ) return null

  const time = ( -direction - Math.sqrt( discriminant ) ) / speedSquared
  return time >= -EPSILON && time <= maximumTime + EPSILON ? Math.max( 0, time ) : null
}

const closestPointOnSegment = ( x, z, segment ) =>
{
  const sx = segment.bx - segment.ax
  const sz = segment.bz - segment.az
  const lengthSquared = sx * sx + sz * sz
  const amount = lengthSquared > EPSILON
    ? clamp( ( ( x - segment.ax ) * sx + ( z - segment.az ) * sz ) / lengthSquared )
    : 0
  return {
    x: segment.ax + sx * amount,
    z: segment.az + sz * amount,
    amount,
  }
}

// A rail is treated as a capsule, covering its face and both rounded endpoints continuously.
const sweepCircleSegment = ( ball, radius, segment, maximumTime ) =>
{
  const sx = segment.bx - segment.ax
  const sz = segment.bz - segment.az
  const length = magnitude2( sx, sz )
  if ( length <= EPSILON ) return null

  const tx = sx / length
  const tz = sz / length
  const nx = -tz
  const nz = tx
  const distance = ( ball.x - segment.ax ) * nx + ( ball.z - segment.az ) * nz
  const normalSpeed = ball.vx * nx + ball.vz * nz
  let best = null

  if ( Math.abs( normalSpeed ) > EPSILON )
  {
    ;[ -1, 1 ].forEach( ( side ) =>
    {
      const time = ( side * radius - distance ) / normalSpeed
      if ( time < -EPSILON || time > maximumTime + EPSILON ) return

      const hitX = ball.x + ball.vx * Math.max( 0, time )
      const hitZ = ball.z + ball.vz * Math.max( 0, time )
      const along = ( hitX - segment.ax ) * tx + ( hitZ - segment.az ) * tz
      const approachSpeed = ball.vx * side * nx + ball.vz * side * nz
      if ( along < -CONTACT_EPSILON || along > length + CONTACT_EPSILON || approachSpeed >= -EPSILON ) return

      const candidate = { time: Math.max( 0, time ), nx: side * nx, nz: side * nz }
      if ( !best || candidate.time < best.time ) best = candidate
    } )
  }

  ;[ [ segment.ax, segment.az ], [ segment.bx, segment.bz ] ].forEach( ( endpoint ) =>
  {
    const time = sweepPointCircle( ball, endpoint[ 0 ], endpoint[ 1 ], radius, maximumTime )
    if ( time === null || ( best && time >= best.time ) ) return

    const hitX = ball.x + ball.vx * time
    const hitZ = ball.z + ball.vz * time
    const normal = normalize2( hitX - endpoint[ 0 ], hitZ - endpoint[ 1 ] )
    if ( ball.vx * normal.x + ball.vz * normal.z < -EPSILON )
    {
      best = { time, nx: normal.x, nz: normal.z }
    }
  } )

  return best
}

const applyClothFriction = ( ball, config, duration ) =>
{
  if ( ball.pocketed ) return

  const { radius, slidingFriction, rollingDeceleration } = config.ball
  const slipX = ball.vx + ball.wz * radius
  const slipZ = ball.vz - ball.wx * radius
  const slipSpeed = magnitude2( slipX, slipZ )

  if ( slipSpeed > 0.002 )
  {
    // Sliding friction moves both translation and spin toward the no-slip rolling state.
    const velocityChange = Math.min(
      slidingFriction * config.gravity * duration,
      slipSpeed / 3.5,
    )
    const changeX = -slipX / slipSpeed * velocityChange
    const changeZ = -slipZ / slipSpeed * velocityChange
    ball.vx += changeX
    ball.vz += changeZ
    ball.wx -= 2.5 * changeZ / radius
    ball.wz += 2.5 * changeX / radius
    return
  }

  const speed = magnitude2( ball.vx, ball.vz )
  if ( speed <= 0.0005 )
  {
    ball.vx = 0
    ball.vz = 0
    ball.wx = 0
    ball.wz = 0
    ball.wy *= Math.max( 0, 1 - duration * 0.6 )
    return
  }

  const nextSpeed = Math.max( 0, speed - rollingDeceleration * duration )
  const scale = nextSpeed / speed
  ball.vx *= scale
  ball.vz *= scale
  ball.wx = ball.vz / radius
  ball.wz = -ball.vx / radius
  ball.wy *= Math.max( 0, 1 - duration * 0.08 )
}

const advanceBalls = ( balls, duration, config ) =>
{
  if ( duration <= 0 ) return

  balls.forEach( ( ball ) =>
  {
    if ( ball.pocketed )
    {
      const damping = 6
      const velocityScale = Math.exp( -damping * duration )
      const distanceScale = ( 1 - velocityScale ) / damping
      ball.x += ball.vx * distanceScale
      ball.z += ball.vz * distanceScale
      ball.vx *= velocityScale
      ball.vz *= velocityScale
      ball.wx *= velocityScale
      ball.wy *= velocityScale
      ball.wz *= velocityScale
      ball.pocketTime += duration
      ball.pocketDepth = 0.5 * config.gravity * ball.pocketTime * ball.pocketTime
      ball.y = config.ball.radius - ball.pocketDepth
      integrateQuaternion( ball.quaternion, {
        x: ball.wx,
        y: ball.wy,
        z: ball.wz,
      }, duration )
      return
    }

    ball.x += ball.vx * duration
    ball.z += ball.vz * duration
    integrateQuaternion( ball.quaternion, {
      x: ball.wx,
      y: ball.wy,
      z: ball.wz,
    }, duration )
  } )
}

const resolveBallCollision = ( first, second, nx, nz, config, diagnostics ) =>
{
  const relativeX = second.vx - first.vx
  const relativeZ = second.vz - first.vz
  const normalSpeed = relativeX * nx + relativeZ * nz
  if ( normalSpeed >= -EPSILON ) return false

  const beforeEnergy = kineticEnergy( first, config ) + kineticEnergy( second, config )
  const { radius, restitution, friction } = config.ball
  const firstMass = first.mass ?? config.ball.mass
  const secondMass = second.mass ?? config.ball.mass
  const inverseMass = 1 / firstMass + 1 / secondMass
  const normalImpulse = -( 1 + restitution ) * normalSpeed / inverseMass

  first.vx -= normalImpulse * nx / firstMass
  first.vz -= normalImpulse * nz / firstMass
  second.vx += normalImpulse * nx / secondMass
  second.vz += normalImpulse * nz / secondMass

  // Tangential contact friction can create realistic side spin but cannot exceed Coulomb friction.
  const tx = -nz
  const tz = nx
  const tangentSpeed = relativeX * tx + relativeZ * tz + ( first.wy + second.wy ) * radius
  const firstInertia = ( 2 / 5 ) * firstMass * radius * radius
  const secondInertia = ( 2 / 5 ) * secondMass * radius * radius
  const tangentInverseMass = inverseMass
    + radius * radius / firstInertia
    + radius * radius / secondInertia
  const tangentImpulse = clamp(
    -tangentSpeed / tangentInverseMass,
    -friction * normalImpulse,
    friction * normalImpulse,
  )
  first.vx -= tangentImpulse * tx / firstMass
  first.vz -= tangentImpulse * tz / firstMass
  second.vx += tangentImpulse * tx / secondMass
  second.vz += tangentImpulse * tz / secondMass

  first.wy += radius * tangentImpulse / firstInertia
  second.wy += radius * tangentImpulse / secondInertia

  diagnostics.ballImpacts += 1
  diagnostics.maxEnergyCorrection = Math.max(
    diagnostics.maxEnergyCorrection,
    capEnergy( [ first, second ], beforeEnergy, config ),
  )
  return true
}

const resolveCushionCollision = ( ball, nx, nz, config, diagnostics ) =>
{
  const incomingSpeed = ball.vx * nx + ball.vz * nz
  if ( incomingSpeed >= -EPSILON ) return false

  const beforeEnergy = kineticEnergy( ball, config )
  const impulseSpeed = -( 1 + config.table.cushionRestitution ) * incomingSpeed
  ball.vx += impulseSpeed * nx
  ball.vz += impulseSpeed * nz
  diagnostics.cushionImpacts += 1
  diagnostics.invalidCushionRebounds += ball.vx * nx + ball.vz * nz <= 0 ? 1 : 0
  diagnostics.maxEnergyCorrection = Math.max(
    diagnostics.maxEnergyCorrection,
    capEnergy( [ ball ], beforeEnergy, config ),
  )
  return true
}

const capturePockets = ( balls, pockets, config, diagnostics ) =>
{
  balls.forEach( ( ball ) =>
  {
    if ( ball.pocketed ) return

    for ( let pocketIndex = 0; pocketIndex < pockets.length; pocketIndex += 1 )
    {
      const pocket = pockets[ pocketIndex ]
      if ( magnitude2( ball.x - pocket.x, ball.z - pocket.z ) > pocket.radius + CONTACT_EPSILON ) continue

      ball.pocketed = true
      ball.pocketIndex = pocketIndex
      ball.pocketTime = 0
      ball.pocketDepth = 0
      diagnostics.pocketCaptures += 1
      break
    }
  } )
}

const resolveCurrentContacts = ( balls, tableGeometry, config, diagnostics ) =>
{
  const diameter = config.ball.radius * 2

  for ( let firstIndex = 0; firstIndex < balls.length; firstIndex += 1 )
  {
    const first = balls[ firstIndex ]
    if ( first.pocketed ) continue

    for ( let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1 )
    {
      const second = balls[ secondIndex ]
      if ( second.pocketed ) continue
      const deltaX = second.x - first.x
      const deltaZ = second.z - first.z
      const distance = magnitude2( deltaX, deltaZ )
      if ( distance > diameter + CONTACT_EPSILON ) continue

      const normal = normalize2( deltaX, deltaZ, firstIndex % 2 === 0 ? 1 : -1, 0 )
      resolveBallCollision( first, second, normal.x, normal.z, config, diagnostics )
    }

    tableGeometry.segments.forEach( ( segment ) =>
    {
      const closest = closestPointOnSegment( first.x, first.z, segment )
      const deltaX = first.x - closest.x
      const deltaZ = first.z - closest.z
      const distance = magnitude2( deltaX, deltaZ )
      if ( distance > config.ball.radius + CONTACT_EPSILON ) return

      const fallback = normalize2(
        -( segment.bz - segment.az ),
        segment.bx - segment.ax,
      )
      const normal = normalize2( deltaX, deltaZ, fallback.x, fallback.z )
      resolveCushionCollision( first, normal.x, normal.z, config, diagnostics )
    } )
  }
}

const correctOverlaps = ( balls, tableGeometry, config ) =>
{
  const diameter = config.ball.radius * 2
  let maximumOverlap = 0

  for ( let firstIndex = 0; firstIndex < balls.length; firstIndex += 1 )
  {
    const first = balls[ firstIndex ]
    if ( first.pocketed ) continue

    for ( let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1 )
    {
      const second = balls[ secondIndex ]
      if ( second.pocketed ) continue
      const deltaX = second.x - first.x
      const deltaZ = second.z - first.z
      const distance = magnitude2( deltaX, deltaZ )
      const overlap = diameter - distance
      if ( overlap <= 1e-7 ) continue

      const normal = normalize2( deltaX, deltaZ, firstIndex % 2 === 0 ? 1 : -1, 0 )
      const correction = overlap * 0.505
      first.x -= normal.x * correction
      first.z -= normal.z * correction
      second.x += normal.x * correction
      second.z += normal.z * correction
      maximumOverlap = Math.max( maximumOverlap, overlap )
    }

    tableGeometry.segments.forEach( ( segment ) =>
    {
      const closest = closestPointOnSegment( first.x, first.z, segment )
      const deltaX = first.x - closest.x
      const deltaZ = first.z - closest.z
      const distance = magnitude2( deltaX, deltaZ )
      const overlap = config.ball.radius - distance
      if ( overlap <= 1e-7 ) return

      const fallback = normalize2(
        -( segment.bz - segment.az ),
        segment.bx - segment.ax,
      )
      const normal = normalize2( deltaX, deltaZ, fallback.x, fallback.z )
      first.x += normal.x * ( overlap + 1e-7 )
      first.z += normal.z * ( overlap + 1e-7 )
      maximumOverlap = Math.max( maximumOverlap, overlap )
    } )
  }

  return maximumOverlap
}

const findEarliestEvent = ( balls, tableGeometry, config, maximumTime ) =>
{
  let earliest = null
  const record = ( event ) =>
  {
    if ( event.time < -EPSILON || event.time > maximumTime + EPSILON ) return
    if ( !earliest || event.time < earliest.time - EPSILON || (
      Math.abs( event.time - earliest.time ) <= EPSILON && event.priority < earliest.priority
    ) ) earliest = event
  }

  balls.forEach( ( ball, ballIndex ) =>
  {
    if ( ball.pocketed ) return

    tableGeometry.pockets.forEach( ( pocket, pocketIndex ) =>
    {
      const time = sweepPointCircle( ball, pocket.x, pocket.z, pocket.radius, maximumTime )
      if ( time !== null ) record( { time, priority: 0, type: 'pocket', ballIndex, pocketIndex } )
    } )

    tableGeometry.segments.forEach( ( segment, segmentIndex ) =>
    {
      const hit = sweepCircleSegment( ball, config.ball.radius, segment, maximumTime )
      if ( hit ) record( {
        ...hit,
        priority: 2,
        type: 'cushion',
        ballIndex,
        segmentIndex,
      } )
    } )
  } )

  const diameter = config.ball.radius * 2
  for ( let firstIndex = 0; firstIndex < balls.length; firstIndex += 1 )
  {
    if ( balls[ firstIndex ].pocketed ) continue
    for ( let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1 )
    {
      if ( balls[ secondIndex ].pocketed ) continue
      const time = sweepCircleCircle(
        balls[ firstIndex ],
        balls[ secondIndex ],
        diameter,
        maximumTime,
      )
      if ( time !== null ) record( {
        time,
        priority: 1,
        type: 'ball',
        firstIndex,
        secondIndex,
      } )
    }
  }

  return earliest
}

const simulateStep = ( balls, tableGeometry, config, diagnostics ) =>
{
  balls.forEach( ( ball ) => applyClothFriction( ball, config, config.timestep ) )
  let remaining = config.timestep

  // Resolve the configured event budget so dense rack contacts cannot tunnel through each other.
  for ( let iteration = 0; iteration < config.collisionIterations && remaining > EPSILON; iteration += 1 )
  {
    const event = findEarliestEvent( balls, tableGeometry, config, remaining )
    if ( !event )
    {
      advanceBalls( balls, remaining, config )
      remaining = 0
      break
    }

    const travelTime = clamp( event.time, 0, remaining )
    advanceBalls( balls, travelTime, config )
    remaining -= travelTime
    capturePockets( balls, tableGeometry.pockets, config, diagnostics )
    resolveCurrentContacts( balls, tableGeometry, config, diagnostics )
    diagnostics.maxCorrectedOverlap = Math.max(
      diagnostics.maxCorrectedOverlap,
      correctOverlaps( balls, tableGeometry, config ),
    )

    // A microscopic advance prevents a resting contact from consuming all event iterations.
    if ( travelTime <= EPSILON && remaining > EPSILON )
    {
      const nudge = Math.min( remaining, 1e-7 )
      advanceBalls( balls, nudge, config )
      remaining -= nudge
    }
  }

  if ( remaining > EPSILON ) advanceBalls( balls, remaining, config )

  // Final positional passes leave no visible overlap after the event budget is used.
  for ( let pass = 0; pass < config.collisionIterations; pass += 1 )
  {
    const overlap = correctOverlaps( balls, tableGeometry, config )
    diagnostics.maxCorrectedOverlap = Math.max( diagnostics.maxCorrectedOverlap, overlap )
    if ( overlap <= 1e-7 ) break
  }

  capturePockets( balls, tableGeometry.pockets, config, diagnostics )
}

const createFrame = ( balls, time, radius ) => freezeDeep( {
  time,
  balls: balls.map( ( ball ) => ( {
    position: { x: ball.x, y: ball.y, z: ball.z },
    quaternion: { ...ball.quaternion },
    velocity: { x: ball.vx, y: 0, z: ball.vz },
    angularVelocity: { x: ball.wx, y: ball.wy, z: ball.wz },
    pocketDepth: ball.pocketDepth,
    pocketIndex: ball.pocketIndex,
    pocketed: ball.pocketed,
    // Keep ball visible during deep 3D gravity drop down recessed pocket cylinder
    visibility: !ball.pocketed || ball.pocketDepth < radius * 8.5,
  } ) ),
} )

const measureSpread = ( balls, initialPositions, config ) =>
{
  const rackBalls = balls.slice( 1 )
  let centerX = 0
  let centerZ = 0
  rackBalls.forEach( ( ball ) =>
  {
    centerX += ball.x
    centerZ += ball.z
  } )
  centerX /= rackBalls.length
  centerZ /= rackBalls.length

  let sumDistanceSquared = 0
  let ballsOutsideRack = 0
  rackBalls.forEach( ( ball, rackIndex ) =>
  {
    const origin = initialPositions[ rackIndex + 1 ]
    // A center moved by one radius has left its own original circular rack footprint.
    const outside = ball.pocketed || magnitude2( ball.x - origin.x, ball.z - origin.z ) >= config.ball.radius
    if ( outside ) ballsOutsideRack += 1
    sumDistanceSquared += ( ball.x - centerX ) ** 2 + ( ball.z - centerZ ) ** 2
  } )

  return {
    ballsOutsideRack,
    rmsSpread: Math.sqrt( sumDistanceSquared / rackBalls.length ),
    rmsBallDiameters: Math.sqrt( sumDistanceSquared / rackBalls.length ) / ( config.ball.radius * 2 ),
  }
}

const maximumUnresolvedOverlap = ( balls, diameter, radius, tableGeometry ) =>
{
  let maximum = 0
  for ( let firstIndex = 0; firstIndex < balls.length; firstIndex += 1 )
  {
    if ( balls[ firstIndex ].pocketed ) continue
    for ( let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1 )
    {
      if ( balls[ secondIndex ].pocketed ) continue
      maximum = Math.max(
        maximum,
        diameter - magnitude2(
          balls[ secondIndex ].x - balls[ firstIndex ].x,
          balls[ secondIndex ].z - balls[ firstIndex ].z,
        ),
      )
    }

    tableGeometry.segments.forEach( ( segment ) =>
    {
      const closest = closestPointOnSegment( balls[ firstIndex ].x, balls[ firstIndex ].z, segment )
      maximum = Math.max(
        maximum,
        radius - magnitude2(
          balls[ firstIndex ].x - closest.x,
          balls[ firstIndex ].z - closest.z,
        ),
      )
    } )
  }
  return Math.max( 0, maximum )
}

// Precompute one deterministic break. The returned graph is deeply frozen for exact reverse sampling.
export function createBreakSimulation ( suppliedConfig = {} )
{
  const config = mergeConfig( suppliedConfig )
  const { radius } = config.ball
  const diameter = radius * 2
  const rackPositions = createRackPositions( config )
  const offsetX = config.striker.impactOffsetX
  const impactZ = config.rack.apexZ + Math.sqrt( diameter * diameter - offsetX * offsetX )
  const approachX = offsetX - config.striker.startX
  const approachZ = impactZ - config.striker.startZ
  const launchDirection = normalize2( approachX, approachZ, 0, -1 )
  const approachDistance = magnitude2( approachX, approachZ )
  // Rolling axis follows the same world-space sign as omega = (v_z / R, 0, -v_x / R).
  // Keep this aligned with sampleBreakState so the striker never flips spin at impact.
  const approachAxis = normalize2( approachZ, -approachX, 1, 0 )
  const impactQuaternion = quaternionFromAxisAngle(
    approachAxis.x,
    0,
    approachAxis.z,
    approachDistance / radius,
  )

  const initialPositions = [
    { x: offsetX, z: impactZ },
    ...rackPositions,
  ]
  const balls = initialPositions.map( ( position, index ) => ( {
    x: position.x,
    y: radius,
    z: position.z,
    mass: config.ball.mass * ( index === 0 ? config.striker.massMultiplier : 1 ),
    vx: index === 0 ? launchDirection.x * config.striker.launchSpeed : 0,
    vz: index === 0 ? launchDirection.z * config.striker.launchSpeed : 0,
    wx: index === 0 ? launchDirection.z * config.striker.launchSpeed / radius : 0,
    wy: 0,
    wz: index === 0 ? -launchDirection.x * config.striker.launchSpeed / radius : 0,
    quaternion: index === 0 ? { ...impactQuaternion } : { x: 0, y: 0, z: 0, w: 1 },
    pocketed: false,
    pocketIndex: -1,
    pocketTime: 0,
    pocketDepth: 0,
  } ) )
  const tableGeometry = createTableGeometry( config )
  const rackBounds = {
    minX: Math.min( ...rackPositions.map( ( position ) => position.x ) ) - radius,
    maxX: Math.max( ...rackPositions.map( ( position ) => position.x ) ) + radius,
    minZ: Math.min( ...rackPositions.map( ( position ) => position.z ) ) - radius,
    maxZ: Math.max( ...rackPositions.map( ( position ) => position.z ) ) + radius,
  }
  const diagnostics = {
    ballImpacts: 0,
    cushionImpacts: 0,
    invalidCushionRebounds: 0,
    pocketCaptures: 0,
    maxCorrectedOverlap: 0,
    maxEnergyCorrection: 0,
  }
  const frames = [ createFrame( balls, 0, radius ) ]
  const totalSteps = Math.round( config.duration / config.timestep )
  let milestoneFrameIndex = -1
  let milestoneMetrics = null
  let naturalMilestone = false

  for ( let step = 1; step <= totalSteps; step += 1 )
  {
    simulateStep( balls, tableGeometry, config, diagnostics )
    const time = step * config.timestep
    frames.push( createFrame( balls, time, radius ) )

    if ( milestoneFrameIndex >= 0 || time + EPSILON < config.milestone.minimumTime ) continue

    const metrics = measureSpread( balls, initialPositions, config )
    const ready = metrics.ballsOutsideRack >= config.milestone.ballsOutsideRack
      && metrics.rmsBallDiameters >= config.milestone.rmsBallDiameters
    const capped = time + EPSILON >= config.milestone.maximumTime

    if ( ready || capped )
    {
      milestoneFrameIndex = step
      milestoneMetrics = metrics
      naturalMilestone = ready
    }
  }

  if ( milestoneFrameIndex < 0 )
  {
    milestoneFrameIndex = Math.min(
      frames.length - 1,
      Math.round( config.milestone.maximumTime / config.timestep ),
    )
    milestoneMetrics = measureSpread( balls, initialPositions, config )
  }

  const finalBalls = frames[ frames.length - 1 ].balls
  const milestones = {
    transitionReadyFrame: milestoneFrameIndex,
    transitionReadyTime: frames[ milestoneFrameIndex ].time,
    naturalMilestone,
    ballsOutsideRack: milestoneMetrics.ballsOutsideRack,
    rmsSpread: milestoneMetrics.rmsSpread,
    rmsBallDiameters: milestoneMetrics.rmsBallDiameters,
  }
  const result = {
    config,
    frames,
    milestones,
    initial: {
      positions: initialPositions,
      strikerStart: { x: config.striker.startX, y: radius, z: config.striker.startZ },
      strikerImpact: { x: offsetX, y: radius, z: impactZ },
      strikerImpactQuaternion: impactQuaternion,
      rackBounds,
    },
    table: tableGeometry,
    diagnostics: {
      ...diagnostics,
      unresolvedOverlap: maximumUnresolvedOverlap( finalBalls.map( ( ball ) => ( {
        x: ball.position.x,
        z: ball.position.z,
        pocketed: ball.pocketed,
      } ) ), diameter, radius, tableGeometry ),
      pocketedBallIndices: finalBalls
        .map( ( ball, index ) => ball.pocketed ? index : -1 )
        .filter( ( index ) => index >= 0 ),
    },
  }

  return freezeDeep( result )
}

let defaultSimulation = null

export const getBreakSimulation = () =>
{
  if ( !defaultSimulation ) defaultSimulation = createBreakSimulation()
  return defaultSimulation
}

const copySampleBall = ( ball ) => ( {
  position: { ...ball.position },
  quaternion: { ...ball.quaternion },
  pocketDepth: ball.pocketDepth,
  pocketed: ball.pocketed,
  visibility: ball.visibility,
} )

const slerpQuaternion = ( first, second, progress ) =>
{
  let bx = second.x
  let by = second.y
  let bz = second.z
  let bw = second.w
  let cosine = first.x * bx + first.y * by + first.z * bz + first.w * bw

  if ( cosine < 0 )
  {
    cosine = -cosine
    bx = -bx
    by = -by
    bz = -bz
    bw = -bw
  }

  let firstScale
  let secondScale
  if ( 1 - cosine > 1e-6 )
  {
    const angle = Math.acos( clamp( cosine, -1, 1 ) )
    const sine = Math.sin( angle )
    firstScale = Math.sin( ( 1 - progress ) * angle ) / sine
    secondScale = Math.sin( progress * angle ) / sine
  }
  else
  {
    firstScale = 1 - progress
    secondScale = progress
  }

  const result = {
    x: first.x * firstScale + bx * secondScale,
    y: first.y * firstScale + by * secondScale,
    z: first.z * firstScale + bz * secondScale,
    w: first.w * firstScale + bw * secondScale,
  }
  normalizeQuaternion( result )
  return result
}

// Sample the same frozen frames in either scroll direction; no live integration occurs here.
export function sampleBreakState ( suppliedProgress, simulation = getBreakSimulation() )
{
  const progress = clamp( suppliedProgress )
  const { config, frames, initial, milestones } = simulation
  const radius = config.ball.radius

  // Phase 1 (0 to 0.28): 8-ball rolls forward immediately on the first swipe into the rack.
  if ( progress <= 0.28 )
  {
    const approachProgress = progress / 0.28
    const x = lerp( initial.strikerStart.x, initial.strikerImpact.x, approachProgress )
    const z = lerp( initial.strikerStart.z, initial.strikerImpact.z, approachProgress )
    const distance = magnitude2( x - initial.strikerStart.x, z - initial.strikerStart.z )
    const direction = normalize2(
      x - initial.strikerStart.x,
      z - initial.strikerStart.z,
      0,
      -1,
    )
    const quaternion = quaternionFromAxisAngle(
      direction.z,
      0,
      -direction.x,
      distance / radius,
    )
    const balls = [ {
      position: { x, y: radius, z },
      quaternion,
      pocketDepth: 0,
      pocketed: false,
      visibility: true,
    } ]

    frames[ 0 ].balls.slice( 1 ).forEach( ( ball ) => balls.push( copySampleBall( ball ) ) )
    return freezeDeep( { balls, opacity: 1, phase: 'approach' } )
  }

  // Phase 2 Break & Scatter (0.28 to 0.76): Rack scatters from 8-ball impact.
  const milestoneFrame = milestones.transitionReadyFrame
  // Freeze on the requested wide scatter so later simulation frames cannot create a dead scroll tail.
  const sampledProgress = Math.min( progress, CINEMATIC_EXIT_START )
  const rawBreakProgress = ( sampledProgress - 0.28 ) / ( CINEMATIC_EXIT_START - 0.28 )
  // Ease through the first impulse so the rack compresses before the full scatter develops.
  const breakProgress = smoothstep( rawBreakProgress )
  const exactFrame = breakProgress * milestoneFrame
  const firstFrameIndex = Math.floor( exactFrame )
  const secondFrameIndex = Math.min( milestoneFrame, firstFrameIndex + 1 )
  const interpolation = exactFrame - firstFrameIndex
  const firstFrame = frames[ firstFrameIndex ]
  const secondFrame = frames[ secondFrameIndex ]
  const balls = firstFrame.balls.map( ( firstBall, index ) =>
  {
    const secondBall = secondFrame.balls[ index ]
    return {
      position: {
        x: lerp( firstBall.position.x, secondBall.position.x, interpolation ),
        y: lerp( firstBall.position.y, secondBall.position.y, interpolation ),
        z: lerp( firstBall.position.z, secondBall.position.z, interpolation ),
      },
      quaternion: slerpQuaternion(
        firstBall.quaternion,
        secondBall.quaternion,
        interpolation,
      ),
      pocketDepth: lerp( firstBall.pocketDepth, secondBall.pocketDepth, interpolation ),
      pocketed: firstBall.pocketed || secondBall.pocketed,
      visibility: firstBall.visibility || secondBall.visibility,
    }
  } )
  const opacity = clamp(
    1 - ( progress - CINEMATIC_EXIT_START ) /
    ( CINEMATIC_EXIT_END - CINEMATIC_EXIT_START ),
  )

  return freezeDeep( {
    balls,
    opacity,
    phase: progress <= CINEMATIC_EXIT_START ? 'break' : 'exit',
  } )
}

// Hold Draft 1 8-ball at start and immediately roll forward into the rack upon first swipe.
export function sampleCinematicBreakState (
  suppliedProgress,
  simulation = getBreakSimulation(),
)
{
  const progress = clamp( suppliedProgress )
  const { config, frames, initial, milestones } = simulation
  const radius = config.ball.radius

  // Phase 1 Approach (0 to 0.28): 8-ball rolls forward immediately upon first swipe into the rack apex.
  if ( progress <= 0.28 )
  {
    const approachProgress = progress / 0.28
    const x = lerp( initial.strikerStart.x, initial.strikerImpact.x, approachProgress )
    const z = lerp( initial.strikerStart.z, initial.strikerImpact.z, approachProgress )
    const distance = magnitude2( x - initial.strikerStart.x, z - initial.strikerStart.z )
    const direction = normalize2(
      x - initial.strikerStart.x,
      z - initial.strikerStart.z,
      0,
      -1,
    )
    const quaternion = quaternionFromAxisAngle(
      direction.z,
      0,
      -direction.x,
      distance / radius,
    )
    const balls = [ {
      position: { x, y: radius, z },
      quaternion,
      pocketDepth: 0,
      pocketed: false,
      visibility: true,
    } ]

    frames[ 0 ].balls.slice( 1 ).forEach( ( ball ) => balls.push( copySampleBall( ball ) ) )
    return freezeDeep( { balls, opacity: 1, phase: 'approach' } )
  }

  // Phase 2 Break & Scatter (0.28 to 0.76): 8-ball impacts rack apex; rack explodes into realistic physics scatter.
  const milestoneFrame = milestones.transitionReadyFrame
  const sampledProgress = Math.min( progress, CINEMATIC_EXIT_START )
  const rawBreakProgress = ( sampledProgress - 0.28 ) /
    ( CINEMATIC_EXIT_START - 0.28 )
  const breakProgress = smoothstep( rawBreakProgress )
  const exactFrame = breakProgress * milestoneFrame
  const firstFrameIndex = Math.floor( exactFrame )
  const secondFrameIndex = Math.min( milestoneFrame, firstFrameIndex + 1 )
  const interpolation = exactFrame - firstFrameIndex
  const firstFrame = frames[ firstFrameIndex ]
  const secondFrame = frames[ secondFrameIndex ]
  const balls = firstFrame.balls.map( ( firstBall, index ) =>
  {
    const secondBall = secondFrame.balls[ index ]
    return {
      position: {
        x: lerp( firstBall.position.x, secondBall.position.x, interpolation ),
        y: lerp( firstBall.position.y, secondBall.position.y, interpolation ),
        z: lerp( firstBall.position.z, secondBall.position.z, interpolation ),
      },
      quaternion: slerpQuaternion(
        firstBall.quaternion,
        secondBall.quaternion,
        interpolation,
      ),
      pocketDepth: lerp( firstBall.pocketDepth, secondBall.pocketDepth, interpolation ),
      pocketed: firstBall.pocketed || secondBall.pocketed,
      visibility: firstBall.visibility || secondBall.visibility,
    }
  } )
  const opacity = clamp(
    1 - ( progress - CINEMATIC_EXIT_START ) /
    ( CINEMATIC_EXIT_END - CINEMATIC_EXIT_START ),
  )

  return freezeDeep( {
    balls,
    opacity,
    phase: progress <= CINEMATIC_EXIT_START ? 'break' : 'exit',
  } )
}
