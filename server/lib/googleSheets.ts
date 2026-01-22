// Google Sheets integration for LinkedIn Content Workflow Engine
// Based on connection:conn_google-sheet integration

import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Helper to append post drafts to a Google Sheet
export async function appendPostsToSheet(
  spreadsheetId: string,
  posts: Array<{
    weekNumber: number;
    postType: string;
    contrarianAngle?: string | null;
    hook: string;
    rehook: string;
    body: string;
    coreInsight: string;
    cta?: string;
    status: string;
  }>
) {
  const sheets = await getUncachableGoogleSheetClient();
  
  // Format post type label with angle for contrarian posts
  const formatPostType = (type: string, angle?: string | null) => {
    if (type === 'contrarian_pov' && angle) {
      const angleLabels: Record<string, string> = {
        calm_reframe: 'Calm Reframe',
        operator_reality: 'Operator Reality',
        systems_view: 'Systems View',
        consequence_view: 'Consequence View',
      };
      return `Contrarian POV - ${angleLabels[angle] || angle}`;
    }
    const typeLabels: Record<string, string> = {
      educational_authority: 'Educational Authority',
      founder_story: 'Founder Story',
      trend_translation: 'Trend Translation',
      system_principle: 'System Principle',
      newsletter_section: 'Newsletter Section',
      twitter_pov: '𝕏 POV Compression',
      twitter_paradox: '𝕏 Paradox / Reframe',
      twitter_operator: '𝕏 Operator Reality',
    };
    return typeLabels[type] || type;
  };

  // Get platform from post type
  const getPlatform = (type: string) => {
    const twitterTypes = ['newsletter_section', 'twitter_pov', 'twitter_paradox', 'twitter_operator'];
    return twitterTypes.includes(type) ? '𝕏' : 'LinkedIn';
  };
  
  const values = posts.map(post => [
    post.weekNumber,
    getPlatform(post.postType),
    formatPostType(post.postType, post.contrarianAngle),
    post.hook,
    post.rehook,
    post.body,
    post.coreInsight,
    post.cta || '',
    post.status,
    '' // Post URL - added manually later
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:J',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values
    }
  });
}

// Helper to create a new spreadsheet with the required columns
export async function createContentSpreadsheet(title: string = 'Content Calendar') {
  const sheets = await getUncachableGoogleSheetClient();
  
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title
      },
      sheets: [{
        properties: {
          title: 'Posts'
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Week #' } },
              { userEnteredValue: { stringValue: 'Platform' } },
              { userEnteredValue: { stringValue: 'Post Type' } },
              { userEnteredValue: { stringValue: 'Hook (Line 1)' } },
              { userEnteredValue: { stringValue: 'Rehook (Line 2)' } },
              { userEnteredValue: { stringValue: 'Body Draft' } },
              { userEnteredValue: { stringValue: 'Core Insight' } },
              { userEnteredValue: { stringValue: 'CTA / Engagement Prompt' } },
              { userEnteredValue: { stringValue: 'Status' } },
              { userEnteredValue: { stringValue: 'Post URL' } }
            ]
          }]
        }]
      }]
    }
  });

  return response.data;
}
