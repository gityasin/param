// Simple test script to check gold price API
import fetch from 'node-fetch';

async function testGoldAPI() {
  // Try both HTTP and HTTPS
  const urls = [
    'http://209.38.188.91/gold-prices',
    'https://209.38.188.91/gold-prices'
  ];

  for (const url of urls) {
    try {
      console.log(`Fetching gold prices from: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'X-API-KEY': 'betul_altin_sever_53'
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.ok) {
        console.error(`Error response from ${url}: HTTP ${response.status}`);
        continue; // Try next URL
      }
      
      const data = await response.json();
      console.log('Gold API Response received successfully!');
      console.log(`First few items: ${JSON.stringify(data.slice(0, 3), null, 2)}`);
      
      // Process the data similar to our app
      const goldPrices = {};
      const categoryMappings = {
        'GRAM_ALTIN': 'Gram Altın',
        'HAS_ALTIN': 'Has Altın',
        'YENI_CEYREK': 'Çeyrek Altın (Yeni)',
        'ESKI_CEYREK': 'Çeyrek Altın (Eski)',
        'YENI_YARIM': 'Yarım Altın (Yeni)',
        'ESKI_YARIM': 'Yarım Altın (Eski)',
        'YENI_TAM': 'Tam Altın (Yeni)',
        'ESKI_TAM': 'Tam Altın (Eski)',
        'YENI_ATA': 'Ata Altın (Yeni)',
        'ESKI_ATA': 'Ata Altın (Eski)',
        'YENI_ATA5': 'Beşli Ata Altın (Yeni)',
        'ESKI_ATA5': 'Beşli Ata Altın (Eski)',
        'YENI_GREMSE': 'Gremse Altın (Yeni)',
        'ESKI_GREMSE': 'Gremse Altın (Eski)',
        '14_AYAR': '14 Ayar Altın',
        '22_AYAR': '22 Ayar Altın',
        'ONS': 'Ons Altın',
        'USD_KG': 'USD/KG',
        'EUR_KG': 'EUR/KG',
        'ALTIN_GUMUS': 'Altın/Gümüş Oranı',
        'GUMUS_TL': 'Gümüş (TL/Gram)',
        'GUMUS_ONS': 'Gümüş (Ons)',
        'GUMUS_USD': 'Gümüş (USD)',
        'PLATIN_ONS': 'Platin (Ons)',
        'PALADYUM_ONS': 'Paladyum (Ons)',
        'PLATIN_USD': 'Platin (USD)',
        'PALADYUM_USD': 'Paladyum (USD)'
      };
      
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.name && item.alis && categoryMappings[item.name]) {
            // Parse price by replacing comma with period and removing any spaces
            const priceStr = item.alis.replace(/\./g, '').replace(',', '.').trim();
            const price = parseFloat(priceStr);
            
            if (!isNaN(price)) {
              goldPrices[categoryMappings[item.name]] = price;
            }
          }
        });
        
        console.log('\nProcessed Gold Prices:');
        console.log(goldPrices);
        
        // If we got a successful response, no need to try other URLs
        return;
      } else {
        console.error('Unexpected data format - not an array');
      }
    } catch (error) {
      console.error(`Error fetching gold prices from ${url}:`, error.message);
    }
  }
  
  console.log('\nFalling back to mock data...');
  const mockPrices = {
    'Gram Altın': 3475.89,
    'Has Altın': 3493.36,
    'Çeyrek Altın (Yeni)': 5694.00,
    'Yarım Altın (Yeni)': 11388.00,
    'Tam Altın (Yeni)': 22707.00
  };
  console.log(mockPrices);
}

testGoldAPI(); 