const fs = require('fs');
const path = require('path');

// Directories to search - use the correct path to the frontend source
const srcDir = path.join(__dirname, 'zebrafish-frontend', 'src');

// Function to process a file
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;
    
    // Replace direct axios calls without /api prefix
    modified = modified.replace(/axios\.(get|post|put|delete)\(['"]\/(?!api)([^'"]+)['"]/g, 'axios.$1(\'/api/$2\'');
    
    // Replace fetch calls without /api prefix
    modified = modified.replace(/fetch\(['"]\/(?!api)([^'"]+)['"]/g, 'fetch(\'/api/$1\'');
    
    if (modified !== content) {
      fs.writeFileSync(filePath, modified);
      console.log(`Updated ${filePath}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
    return false;
  }
}

// Function to recursively process all JS/JSX files
function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Directory doesn't exist: ${dir}`);
    return 0;
  }

  const files = fs.readdirSync(dir);
  let count = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (file !== 'node_modules' && file !== '.git' && file !== 'build') {
        count += processDirectory(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      if (processFile(fullPath)) {
        count++;
      }
    }
  }
  
  return count;
}

console.log('Starting API URL update...');
console.log(`Scanning directory: ${srcDir}`);
const updatedFilesCount = processDirectory(srcDir);
console.log(`Done! Updated ${updatedFilesCount} files.`);