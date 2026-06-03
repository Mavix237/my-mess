# My Mess

A React mindmap for organizing tasks around a main category. Built with **React 19**, **TypeScript**, and **Vite**.

## Live site (GitHub Pages)

**https://mavix237.github.io/my-mess/**

Pushes to `main` deploy automatically via GitHub Actions. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions** (one-time setup).

## Run locally in your browser

```bash
npm install
npm run dev
```

Open **http://localhost:5173** (hot reload while you edit).

### Preview a production build locally

```bash
npm run build
npm run preview
```

Open **http://localhost:4173/my-mess/** (matches the GitHub Pages path).

## Stack

| Layer | Technology |
|-------|------------|
| UI | React 19 |
| Language | TypeScript |
| Bundler | Vite 6 |
| Styling | CSS Modules |

Data is saved automatically in your browser (`localStorage`).

## Features

- Draggable infinite canvas (pan + reposition nodes)
- Main category with branching tasks
- Checkboxes, priority levels, expandable notes
- Paste images into notes
