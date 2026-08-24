# Luraph Script Analyzer

A premium, secure static code analysis panel and reverse engineering assistant designed specifically to inspect obfuscated JavaScript and Lua files (particularly those protected via Luraph Obfuscator) safely. 

This application parses target scripts into Abstract Syntax Trees (ASTs), executes heuristic threat rules, maps branching control flow vectors, and processes runtime simulations inside isolated virtual environments—all without attempting to bypass license keys, crack cipher text, or alter proprietary headers.

---

## 🚀 Key Features

* **Static Code Analysis**: Walks code trees to evaluate entropy ratios, name layouts, and control-flow density.
* **Monaco Editor Studio**: Side-by-side layout syncing highlighted line selections between editor views, warnings tables, and syntax sub-nodes.
* **Security Rules Engine**: Automatically audits operations for critical/high flags like `eval()`, `loadstring()`, process spawns, file system access, and credentials leaks.
* **Unified AST Explorer**: Maps Babel JS and `luaparse` Lua syntax nodes into a single standardized tree browser.
* **Interactive Control Flow Graph**: Dynamically plots conditions and loops as node-edge visuals using React Flow.
* **Isolated Sandbox Console**: Simulates VM run-times, capturing execution timelines while strictly disabling file system write locks or socket requests.
* **Printable PDF Reports**: Formats aggregates (obfuscation grades, network endpoints, file properties) into clean, print-friendly reports.

---

## 🛠️ Tech Stack

* **Frontend Framework**: Next.js 15+ (App Router), React 19, TypeScript
* **Styling & Animation**: Tailwind CSS, Framer Motion
* **Interactive Graphics**: Monaco Editor, React Flow (`@xyflow/react`), Recharts
* **Database & ORM**: SQLite (default), Prisma v7 (compliant with driver adapters)
* **Backend Runtime**: Node.js, VM Sandbox Module, REST APIs

---

## 📂 Project Structure

```
├── 📁 generated
│   └── 📁 prisma
│       ├── 📁 internal
│       │   ├── 📄 class.ts
│       │   ├── 📄 prismaNamespace.ts
│       │   └── 📄 prismaNamespaceBrowser.ts
│       ├── 📁 models
│       │   ├── 📄 Analysis.ts
│       │   ├── 📄 AnalysisLog.ts
│       │   ├── 📄 Dependency.ts
│       │   ├── 📄 Function.ts
│       │   ├── 📄 Metric.ts
│       │   ├── 📄 NetworkEvent.ts
│       │   ├── 📄 Script.ts
│       │   ├── 📄 SecurityFinding.ts
│       │   ├── 📄 StringLiteral.ts
│       │   └── 📄 User.ts
│       ├── 📄 browser.ts
│       ├── 📄 client.ts
│       ├── 📄 commonInputTypes.ts
│       ├── 📄 enums.ts
│       └── 📄 models.ts
├── 📁 prisma
│   ├── 📄 schema.prisma
│   └── 📄 seed.ts
├── 📁 public
│   ├── 🖼️ file.svg
│   ├── 🖼️ globe.svg
│   ├── 🖼️ next.svg
│   ├── 🖼️ vercel.svg
│   └── 🖼️ window.svg
├── 📁 scratch
│   └── 📄 test_ast.ts
├── 📁 src
│   ├── 📁 app
│   │   ├── 📁 analysis
│   │   │   └── 📁 [id]
│   │   │       └── 📄 page.tsx
│   │   ├── 📁 api
│   │   │   ├── 📁 auth
│   │   │   │   ├── 📁 find-account
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 forgot-password
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 login
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 logout
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 me
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 register
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   └── 📁 reset-password
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 deobfuscate
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📁 scripts
│   │   │       ├── 📁 [id]
│   │   │       │   ├── 📁 [dataType]
│   │   │       │   │   └── 📄 route.ts
│   │   │       │   ├── 📁 analyze
│   │   │       │   │   └── 📄 route.ts
│   │   │       │   └── 📄 route.ts
│   │   │       └── 📄 route.ts
│   │   ├── 📁 deobfuscate
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 find-account
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 forgot-password
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 login
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 register
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 reports
│   │   │   └── 📁 [id]
│   │   │       └── 📄 page.tsx
│   │   ├── 📁 reset-password
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 upload
│   │   │   └── 📄 page.tsx
│   │   ├── 📄 favicon.ico
│   │   ├── 🎨 globals.css
│   │   ├── 📄 layout.tsx
│   │   └── 📄 page.tsx
│   ├── 📁 components
│   │   ├── 📄 LayoutShell.tsx
│   │   └── 📄 ToastContext.tsx
│   ├── 📁 lib
│   │   ├── 📁 analyzer
│   │   │   ├── 📄 control-flow.ts
│   │   │   ├── 📄 parser-adapter.ts
│   │   │   ├── 📄 static-engine.test.ts
│   │   │   └── 📄 static-engine.ts
│   │   ├── 📁 deobfuscator
│   │   │   └── 📄 luraph.ts
│   │   ├── 📁 sandbox
│   │   │   └── 📄 runner.ts
│   │   ├── 📄 auth.ts
│   │   └── 📄 prisma.ts
│   └── 📄 middleware.ts
├── ⚙️ .gitignore
├── 🐳 Dockerfile
├── 📝 README.md
├── 📄 dev.db
├── ⚙️ docker-compose.yml
├── 📄 eslint.config.mjs
├── 📄 next.config.ts
├── ⚙️ package-lock.json
├── ⚙️ package.json
├── 📄 postcss.config.mjs
├── 📄 prisma.config.ts
├── ⚙️ skills-lock.json
└── ⚙️ tsconfig.json
```

---

## 💻 Quick Start Guide

### 1. Prerequsite Installation
Ensure you have **Node.js (v20.19.0+)** and **npm** installed on your system.

### 2. Install Project Dependencies
Clone the repository and install dependencies in the project root:
```bash
npm install
```

### 3. Synchronize Database & Seed Credentials
Set up the SQLite database and create the default admin credentials (`admin` / `admin123`):
```bash
# Push schema and generate the client
npx prisma db push

# Seed the database
npx prisma db seed
```

### 4. Run Local Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🐳 Deploying with Docker

You can containerize and spin up the complete application using Docker:

### 1. Build and Start Container
Run the following command at the project root:
```bash
docker-compose up --build -d
```

### 2. Stop and Tear Down
```bash
docker-compose down
```

---

## ⚖️ Legal Disclaimer
This software is intended strictly for security audits, developer reverse-engineering education, malware logic analysis, and code optimization reviews on scripts owned by the user or where explicit permission has been obtained. We do not support, encourage, or host features designed to bypass digital rights management, crack licensing locks, or bypass software access permissions.
