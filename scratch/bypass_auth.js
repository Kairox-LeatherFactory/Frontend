const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.js', 'utf8');

// Replace `const [user, setUser] = useState(null);`
content = content.replace(/useState\(null\)/g, 'useState("admin")');
content = content.replace(/const \[token, setToken\] = useState\("admin"\);/, 'const [token, setToken] = useState("mock_token");');

fs.writeFileSync('src/context/AuthContext.js', content);
console.log('Bypassed auth');
