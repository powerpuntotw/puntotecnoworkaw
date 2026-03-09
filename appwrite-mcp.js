#!/usr/bin/env node
import { AppwriteMcpServer } from '@appwrite/mcp';

const server = new AppwriteMcpServer();
server.run().catch((error) => {
    console.error("Fatal error in Appwrite MCP server:", error);
    process.exit(1);
});