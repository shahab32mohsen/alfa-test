#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { mkdirSync, existsSync, rmSync } from 'fs';

const outdir = 'lambda-dist';

// Clean and create output directory
if (existsSync(outdir)) {
  rmSync(outdir, { recursive: true });
}
mkdirSync(outdir);

console.log('📦 Building Lambda handler...');

await esbuild.build({
  entryPoints: ['src/lambda-handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: `${outdir}/index.js`,
  external: [],
  minify: true,
  sourcemap: false,
});

console.log('✅ Bundle created');

// Create zip file for Lambda
console.log('📦 Creating deployment package...');
execSync(`cd ${outdir} && zip -r ../lambda-deployment.zip .`, { stdio: 'inherit' });

console.log('✅ Lambda deployment package ready: lambda-deployment.zip');

