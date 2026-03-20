const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');
const { minify } = require('html-minifier-terser');

async function build() {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');

    console.log('Obfuscating JavaScript...');
    const obfuscatedJs = JavaScriptObfuscator.obfuscate(js, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        identifierNamesGenerator: 'hexadecimal',
        rotateStringArray: true,
        selfDefending: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        transformObjectKeys: false,
        unicodeEscapeSequence: false,
        debugProtection: false,
        disableConsoleOutput: false,
    }).getObfuscatedCode();

    console.log('Minifying CSS...');
    const minifiedCss = new CleanCSS({ level: 2 }).minify(css).styles;

    console.log('Inlining and minifying HTML...');
    let output = html
        .replace('<link rel="stylesheet" href="style.css">', `<style>${minifiedCss}</style>`)
        .replace('<script src="script.js"></script>', `<script>${obfuscatedJs}</script>`);

    output = await minify(output, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        minifyCSS: true,
        minifyJS: false,
    });

    const docsDir = path.join(__dirname, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'index.html'), output);

    const sizeKB = (Buffer.byteLength(output) / 1024).toFixed(1);
    console.log(`\nBuild complete! → docs/index.html (${sizeKB} KB)`);
    console.log('GitHub Pages will serve from the docs/ folder.');
}

build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
