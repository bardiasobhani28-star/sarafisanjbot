async function sendRatesToTelegram(env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID) {
    return { ok: false, error: "متغیرهای TELEGRAM_BOT_TOKEN یا TELEGRAM_CHANNEL_ID در کلودفلر ست نشده‌اند." };
  }

  try {
    const rawResults = await fetchLiveExchanges();
    const validLivePrices = rawResults.filter(r => r.status === 'online' && r.buyPrice > 100000).map(r => r.buyPrice);
    const liveAnchorPrice = validLivePrices.length > 0 ? Math.round(validLivePrices.reduce((a, b) => a + b, 0) / validLivePrices.length) : CONFIG.ANCHOR_FALLBACK_PRICE;
    const allExchanges = compileFullExchangeList(rawResults, liveAnchorPrice);

    const active = allExchanges.filter(e => e.buyPrice > 0);
    if (!active.length) return { ok: false, error: "هیچ قیمتی دریافت نشد." };

    const bestBuy = [...active].sort((a, b) => b.buyPrice - a.buyPrice)[0];
    const bestSell = [...active].filter(e => e.sellPrice > 0).sort((a, b) => a.sellPrice - b.sellPrice)[0];
    const avg = Math.round(active.reduce((acc, curr) => acc + curr.buyPrice, 0) / active.length);

    // قالب‌بندی بسیار مرتب و فشرده برای هر صرافی (یک خطی برای هر صرافی)
    let exchangesListText = '';
    allExchanges.forEach(ex => {
      const buyStr = ex.buyPrice ? ex.buyPrice.toLocaleString('fa-IR') : '---';
      const sellStr = ex.sellPrice ? ex.sellPrice.toLocaleString('fa-IR') : '---';
      exchangesListText += `🔸 *${ex.name}*\n   📥 خرید: \`${buyStr}\`\n   📤 فروش: \`${sellStr}\`\n`;
    });

    const message = `📊 *نرخ لحظه‌ای تتر (USDT)*\n\n` +
      `🟢 *بالاترین خرید:* ${bestBuy.name} (\`${bestBuy.buyPrice.toLocaleString('fa-IR')}\`)\n` +
      `🔵 *کمترین فروش:* ${bestSell.name} (\`${bestSell.sellPrice.toLocaleString('fa-IR')}\`)\n` +
      `📈 *میانگین بازار:* \`${avg.toLocaleString('fa-IR')} تومان\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *لیست نرخ صرافی‌ها:*\n\n` +
      exchangesListText;

    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    return await tgRes.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
