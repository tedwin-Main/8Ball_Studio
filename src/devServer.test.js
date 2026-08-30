import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve } from 'node:path'

const projectRoot = resolve( '.' )
const viteCli = resolve( 'node_modules/vite/bin/vite.js' )

const getFreePort = async () =>
{
  const probe = createServer()
  probe.listen( 0, '127.0.0.1' )
  await once( probe, 'listening' )
  const port = probe.address().port
  probe.close()
  await once( probe, 'close' )
  return port
}

const waitForDevServer = ( processHandle, port ) => new Promise( ( resolveReady, reject ) =>
{
  let output = ''
  let settled = false
  const timeout = setTimeout( () =>
  {
    if ( settled ) return
    settled = true
    reject( new Error( `Vite did not start on port ${port}.\n${output}` ) )
  }, 5000 )

  const finish = ( callback ) =>
  {
    if ( settled ) return
    settled = true
    clearTimeout( timeout )
    callback()
  }

  const onOutput = ( chunk ) =>
  {
    output += chunk.toString()
    if ( /Local:\s+http:\/\/127\.0\.0\.1/.test( output ) ) finish( resolveReady )
  }

  processHandle.stdout.on( 'data', onOutput )
  processHandle.stderr.on( 'data', onOutput )
  processHandle.once( 'error', ( error ) => finish( () => reject( error ) ) )
  processHandle.once( 'exit', ( code, signal ) =>
  {
    if ( code !== 0 )
    {
      finish( () => reject( new Error( `Vite exited before serving localhost (code ${code}, signal ${signal}).\n${output}` ) ) )
    }
  } )
} )

test( 'Vite dev server serves the Story entrypoint on the supported local Node runtime', async () =>
{
  const port = await getFreePort()
  const devServer = spawn(
    process.execPath,
    [ viteCli, '--host', '127.0.0.1', '--port', String( port ), '--strictPort' ],
    { cwd: projectRoot, stdio: [ 'ignore', 'pipe', 'pipe' ] },
  )

  try
  {
    await waitForDevServer( devServer, port )
    const response = await fetch( `http://127.0.0.1:${port}/` )
    const html = await response.text()

    assert.equal( response.status, 200 )
    assert.match( html, /src="\/src\/main\.jsx"/ )
  }
  finally
  {
    devServer.kill( 'SIGTERM' )
    if ( devServer.exitCode === null ) await once( devServer, 'exit' )
  }
} )
