#!/usr/bin/env node
/**
 * Build script for the photo portfolio.
 *
 * Scans /images for source photos, resizes/optimizes them into dist/images
 * (full-size + thumbnail versions), writes dist/gallery.json describing the
 * gallery, and copies the static site (index.html, css/, js/) into dist/.
 *
 * Run with: npm run build
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "images");
const DIST_DIR = path.join(ROOT, "dist");
const DIST_IMAGES_DIR = path.join(DIST_DIR, "images");
const DIST_FULL_DIR = path.join(DIST_IMAGES_DIR, "full");
const DIST_THUMB_DIR = path.join(DIST_IMAGES_DIR, "thumb");

const VALID_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const FULL_MAX_WIDTH = 2000;
const THUMB_WIDTH = 640;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;
const PNG_QUALITY = 82;

function titleCaseFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function ensureDirs() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_FULL_DIR, { recursive: true });
  fs.mkdirSync(DIST_THUMB_DIR, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyStaticSite() {
  fs.copyFileSync(path.join(ROOT, "index.html"), path.join(DIST_DIR, "index.html"));
  copyRecursive(path.join(ROOT, "css"), path.join(DIST_DIR, "css"));
  copyRecursive(path.join(ROOT, "js"), path.join(DIST_DIR, "js"));
}

async function encodeVariant(pipeline, ext, quality) {
  if (ext === ".png") return pipeline.png({ quality, compressionLevel: 9 });
  if (ext === ".webp") return pipeline.webp({ quality });
  return pipeline.jpeg({ quality, mozjpeg: true });
}

async function processImage(filename) {
  const srcPath = path.join(IMAGES_DIR, filename);
  const ext = path.extname(filename).toLowerCase();
  const outName = filename;

  const metadata = await sharp(srcPath).metadata();
  const orientedWidth =
    metadata.orientation && metadata.orientation >= 5 ? metadata.height : metadata.width;
  const orientedHeight =
    metadata.orientation && metadata.orientation >= 5 ? metadata.width : metadata.height;

  const fullPipeline = sharp(srcPath)
    .rotate()
    .resize({ width: FULL_MAX_WIDTH, withoutEnlargement: true });
  await (await encodeVariant(fullPipeline, ext, JPEG_QUALITY)).toFile(
    path.join(DIST_FULL_DIR, outName)
  );

  const thumbPipeline = sharp(srcPath)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true });
  await (await encodeVariant(thumbPipeline, ext, 75)).toFile(
    path.join(DIST_THUMB_DIR, outName)
  );

  const scale = orientedWidth ? Math.min(1, FULL_MAX_WIDTH / orientedWidth) : 1;

  return {
    file: outName,
    alt: titleCaseFromFilename(filename),
    width: orientedWidth ? Math.round(orientedWidth * scale) : null,
    height: orientedHeight ? Math.round(orientedHeight * scale) : null,
    full: `images/full/${outName}`,
    thumb: `images/thumb/${outName}`,
  };
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const filenames = fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => VALID_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  await ensureDirs();
  copyStaticSite();

  if (filenames.length === 0) {
    fs.writeFileSync(path.join(DIST_DIR, "gallery.json"), "[]\n");
    console.log("No images found in /images. Drop photos in and run `npm run build` again.");
    return;
  }

  console.log(`Processing ${filenames.length} image(s)...`);
  const gallery = [];
  for (const filename of filenames) {
    process.stdout.write(`  ${filename} ... `);
    try {
      const entry = await processImage(filename);
      gallery.push(entry);
      console.log("done");
    } catch (err) {
      console.log("FAILED");
      console.error(`    ${err.message}`);
    }
  }

  fs.writeFileSync(path.join(DIST_DIR, "gallery.json"), JSON.stringify(gallery, null, 2) + "\n");
  console.log(`\nBuilt gallery with ${gallery.length} photo(s) -> dist/gallery.json`);
  console.log("Preview with: npm run serve");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
