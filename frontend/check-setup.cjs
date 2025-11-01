// Save as check-setup.js in frontend/ directory
// Run: node check-setup.js

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'index.html',
  'src/main.tsx',
  'src/App.tsx',
  'src/index.css',
  '.env'
];

const requiredDirs = [
  'src/components',
  'src/hooks',
  'src/lib',
  'src/pages',
  'src/routes',
  'src/store',
  'src/types'
];

console.log('🔍 Checking frontend setup...\n');

let errors = 0;

// Check files
console.log('📄 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) errors++;
});

// Check directories
console.log('\n📁 Checking required directories:');
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  console.log(`  ${exists ? '✅' : '❌'} ${dir}`);
  if (!exists) errors++;
});

// Check node_modules
console.log('\n📦 Checking dependencies:');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`  ${nodeModulesExists ? '✅' : '❌'} node_modules`);
if (!nodeModulesExists) {
  console.log('  ⚠️  Run: npm install');
  errors++;
}

// Check package.json
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('\n📋 Checking package.json:');
  console.log(`  ${pkg.type === 'module' ? '✅' : '❌'} type: "module"`);
  if (pkg.type !== 'module') errors++;
  
  const requiredDeps = [
    'react',
    'react-dom',
    'react-router-dom',
    'zustand',
    '@tanstack/react-query',
    'axios'
  ];
  
  console.log('\n  Required dependencies:');
  requiredDeps.forEach(dep => {
    const exists = pkg.dependencies && pkg.dependencies[dep];
    console.log(`    ${exists ? '✅' : '❌'} ${dep}`);
    if (!exists) errors++;
  });
  
  const requiredDevDeps = [
    'vite',
    'typescript',
    '@vitejs/plugin-react',
    'tailwindcss'
  ];
  
  console.log('\n  Required devDependencies:');
  requiredDevDeps.forEach(dep => {
    const exists = pkg.devDependencies && pkg.devDependencies[dep];
    console.log(`    ${exists ? '✅' : '❌'} ${dep}`);
    if (!exists) errors++;
  });
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0) {
  console.log('✅ Setup looks good! Try running: npm run dev');
} else {
  console.log(`❌ Found ${errors} issue(s). Please fix them and try again.`);
  console.log('\nQuick fixes:');
  console.log('  1. Run: npm install');
  console.log('  2. Ensure all files from artifacts are created');
  console.log('  3. Check that .env exists (copy from .env.example)');
}
console.log('='.repeat(50) + '\n');