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
    hook: string;
    rehook: string;
    body: string;
    coreInsight: string;
    cta?: string;
    status: string;
  }>
) {
  const sheets = await getUncachableGoogleSheetClient();
  
  const values = posts.map(post => [
    post.weekNumber,
    post.postType,
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
    range: 'A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values
    }
  });
}

// Helper to create a new spreadsheet with the required columns
export async function createContentSpreadsheet(title: string = 'LinkedIn Content Calendar') {
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
