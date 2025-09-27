#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { logger } from '../src/utils/logger';
import { supabaseService } from '../src/services/supabase.service';

interface ModalApp {
  name: string;
  url?: string;
  status: string;
}

async function getModalApps(): Promise<ModalApp[]> {
  try {
    // Check if modal CLI is available
    try {
      execSync('which modal', { encoding: 'utf8' });
    } catch {
      logger.warn('Modal CLI not found. Please install it with: pip install modal');
      return [];
    }

    // Get list of Modal apps
    const output = execSync('modal app list --json', { encoding: 'utf8' });
    let raw: any = null;
    try {
      raw = JSON.parse(output);
    } catch (_) {
      // Some CLI versions may output NDJSON; parse line by line
      raw = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter((x) => !!x);
    }

    const rows: any[] = Array.isArray(raw) ? raw : (raw?.apps || raw?.data || []);
    logger.info(`Found ${rows.length} Modal apps`);

    const mapped = rows.map((app: any) => {
      const name = app.name || app.app_name || app.appName || app.tag || app.app || app.app_id || app.id;
      const url = app.url || app.web_url || app.endpoint || app.endpoint_url || undefined;
      const status = app.status || app.state || app.lifecycle_status || app.lifecycle || 'unknown';
      return { name, url, status } as ModalApp;
    });

    // If names are missing, log keys to improve visibility
    const unnamed = mapped.filter((m) => !m.name);
    if (unnamed.length > 0) {
      const sample = rows.slice(0, Math.min(rows.length, 3)).map((r) => Object.keys(r));
      logger.warn(`Could not determine app names for ${unnamed.length} rows. Sample keys: ${JSON.stringify(sample)}`);
    }

    return mapped;
  } catch (error) {
    logger.error('Failed to get Modal apps:', error);
    return [];
  }
}

async function getDeploymentIngress(appName: string, functionName: string): Promise<string | null> {
  try {
    // Preferred: query via Python helper using app and function names
    const helperPath = require('path').join(__dirname, 'get_web_url.py');
    const cmd = `python3 ${helperPath} --app ${appName} --function ${functionName || process.env.FUNCTION_NAME || 'asgi-app'}`;
    const url = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    if (url && /^https?:\/\//.test(url)) return url;

    return null;
  } catch (error) {
    logger.warn(`Could not get ingress for ${appName}:`, error);
    return null;
  }
}

async function syncDeployments() {
  try {
    await supabaseService.initialize();
    logger.info('Supabase connected');

    const dbDeployments = await supabaseService.getModelDeployments();
    const deployments = dbDeployments || [];
    logger.info(`Found ${deployments.length} deployments in database`);

    // Get all Modal apps (best-effort; script will still try direct lookup per deployment)
    const modalApps = await getModalApps();
    
    let updated = 0;
    let found = 0;
    
    for (const deployment of deployments) {
      const appName = deployment.app_name as string;
      const modelId = deployment.model_id as string;
      const preference = deployment.preference as string | null;
      const status = deployment.status as string;
      const ingressUrl = deployment.ingress_url as string | null;
      const functionName = deployment.function_name as string | null;

      logger.info(`\nChecking deployment: ${appName}`);
      logger.info(`  Model: ${modelId}`);
      logger.info(`  Preference: ${preference}`);
      logger.info(`  Current status: ${status}`);
      logger.info(`  Current URL: ${ingressUrl || 'null'}`);
      
      // Try to locate Modal app via list for visibility, but proceed regardless
      const modalApp = modalApps.find(app => app.name === appName);
      if (modalApp) {
        found++;
        logger.info(`  ✅ Found Modal app in list: ${modalApp.name} (${modalApp.status})`);
      } else {
        logger.warn(`  ℹ️ App ${deployment.appName} not found in list; attempting direct lookup...`);
      }

      // Get the ingress URL directly via Python helper
      const nextIngressUrl = await getDeploymentIngress(appName, functionName || '')

      let needsUpdate = false;
      const updates: Record<string, any> = {};

      // If we got a URL, we can confidently mark as deployed
      if (nextIngressUrl) {
        if (status !== 'deployed') {
          updates.status = 'deployed';
          needsUpdate = true;
          logger.info(`  📝 Status: ${status} → deployed`);
        }
        if (nextIngressUrl !== ingressUrl) {
          updates.ingress_url = nextIngressUrl;
          needsUpdate = true;
          logger.info(`  📝 URL: ${ingressUrl || 'null'} → ${nextIngressUrl}`);
        }
      }

      if (needsUpdate) {
        await supabaseService.updateModelDeployment(deployment.id, updates);
        updated++;
        logger.info(`  ✅ Updated deployment in database`);
      } else {
        logger.info(`  ✅ No updates needed`);
      }
    }
    
    // Show summary
    logger.info(`\n📊 Summary:`);
    logger.info(`  Database deployments: ${dbDeployments.length}`);
    logger.info(`  Modal apps: ${modalApps.length}`);
    logger.info(`  Matched: ${found}`);
    logger.info(`  Updated: ${updated}`);
    
    // List unmatched Modal apps
    const unmatchedApps = modalApps.filter(app => 
      !deployments.some(dep => dep.app_name === app.name)
    );
    
    if (unmatchedApps.length > 0) {
      logger.info(`\n🔍 Unmatched Modal apps:`);
      unmatchedApps.forEach(app => {
        logger.info(`  - ${app.name} (${app.status})`);
      });
    }
    
  } catch (error) {
    logger.error('Sync failed:', error);
    process.exit(1);
  } finally {
    // Supabase client requires no explicit teardown
  }
}

// Run the sync
if (require.main === module) {
  syncDeployments();
}
