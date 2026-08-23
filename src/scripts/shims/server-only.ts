// Test-environment shim: allows tsx test scripts to import modules that
// declare `import 'server-only'` outside of Next.js.
// Used only via tsconfig.scripts.json (never by the Next build).
export {};
