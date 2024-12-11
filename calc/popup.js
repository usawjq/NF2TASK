document.getElementById('calculate').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'getData' }, (battles) => {
    if (!battles || battles.length === 0) {
      alert('未找到战绩数据！');
      return;
    }

    const stats = calculateStats(battles);
    updateUI(stats);
  });
});

function calculateStats(battles) {
  const stats = {
    totalGames: battles.length,
    wins: battles.filter(b => b.result === '胜').length,
    totalDamage: battles.reduce((sum, b) => sum + b.damage, 0),
    totalSinks: battles.reduce((sum, b) => sum + b.sinks, 0),
    avgBattleTime: calculateAverageBattleTime(battles)
  };
  
  stats.avgDamage = Math.round(stats.totalDamage / stats.totalGames);
  
  return stats;
}

function calculateAverageBattleTime(battles) {
  const totalSeconds = battles.reduce((sum, battle) => {
    const [minutes, seconds] = battle.duration.split(':').map(n => parseInt(n.trim()));
    return sum + (minutes * 60 + seconds);
  }, 0);
  
  const avgSeconds = Math.round(totalSeconds / battles.length);
  const minutes = Math.floor(avgSeconds / 60);
  const seconds = avgSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateUI(stats) {
  document.getElementById('totalGames').textContent = stats.totalGames;
  document.getElementById('wins').textContent = `${stats.wins} (${Math.round(stats.wins/stats.totalGames*100)}%)`;
  document.getElementById('totalDamage').textContent = stats.totalDamage.toLocaleString();
  document.getElementById('avgDamage').textContent = stats.avgDamage.toLocaleString();
  document.getElementById('totalSinks').textContent = stats.totalSinks;
  document.getElementById('avgBattleTime').textContent = stats.avgBattleTime;
} 