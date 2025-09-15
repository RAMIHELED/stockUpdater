// stock-monitor.js
const fetch = require('node-fetch');

const stockSymbols = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 
  'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'UBER', 'SPOT',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'DIS', 'KO', 'PEP'
];

async function getStockDrops() {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Search for today's stock market data and find stocks that dropped more than 2%. 
            Focus on these stocks: ${stockSymbols.join(', ')}.
            
            Return ONLY valid JSON in this format:
            {
              "date": "2025-09-15",
              "bigDrops": [
                {
                  "symbol": "STOCK",
                  "name": "Company Name",
                  "currentPrice": 123.45,
                  "previousClose": 130.00,
                  "percentChange": -5.04
                }
              ]
            }`
          }
        ]
      })
    });

    const data = await response.json();
    let responseText = data.content[0].text;
    responseText = responseText.replace(/```json\s?/g, "").replace(/```\s?/g, "").trim();
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return { bigDrops: [] };
  }
}

async function sendEmail(stockDrops) {
  if (stockDrops.length === 0) {
    console.log('No stocks dropped more than 2% today');
    return;
  }

  // Create email table
  let tableRows = stockDrops.map(stock => 
    `<tr>
      <td>${stock.name}</td>
      <td>$${stock.previousClose.toFixed(2)}</td>
      <td>$${stock.currentPrice.toFixed(2)}</td>
      <td>${stock.percentChange.toFixed(2)}%</td>
    </tr>`
  ).join('');

  const emailBody = `
    <h2>Stocks that went down today</h2>
    <table border="1" style="border-collapse: collapse;">
      <tr>
        <th>Stock Name</th>
        <th>Start Price</th>
        <th>End Price</th>
        <th>% Down</th>
      </tr>
      ${tableRows}
    </table>
  `;

  // Send email using SendGrid
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: 'ramiheled2211@gmail.com',
    from: process.env.FROM_EMAIL, // Your verified sender email
    subject: 'Stocks that went down today',
    html: emailBody,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully with ${stockDrops.length} stock drops`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Main function
async function main() {
  console.log('Starting daily stock monitor...');
  const stockData = await getStockDrops();
  await sendEmail(stockData.bigDrops || []);
  console.log('Stock monitor completed');
}

main();
