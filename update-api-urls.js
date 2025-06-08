const fs = require('fs');
const path = require('path');

// Directories to search
const srcDir = path.join(__dirname, 'zebrafish-frontend', 'src');

// Process a single file
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;
    
    // Replace hardcoded URLs with API_BASE_URL
    modified = modified.replace(
      /(['"`])http:\/\/localhost:5000\/api\/([^'"`]+)(['"`])/g, 
      '`${API_BASE_URL}/$2`'
    );
    
    if (modified !== content) {
      // Add the import if needed
      if (!modified.includes('import { API_BASE_URL }') && 
          modified.includes('${API_BASE_URL}')) {
        // Add import after the last import statement
        const lastImportIndex = modified.lastIndexOf('import ');
        const lastImportEndIndex = modified.indexOf(';', lastImportIndex);
        
        if (lastImportIndex > -1 && lastImportEndIndex > -1) {
          const beforeImport = modified.substring(0, lastImportEndIndex + 1);
          const afterImport = modified.substring(lastImportEndIndex + 1);
          modified = beforeImport + '\nimport { API_BASE_URL } from \'../utils/config\';' + afterImport;
        }
      }
      
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

// Process all files in a directory recursively
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