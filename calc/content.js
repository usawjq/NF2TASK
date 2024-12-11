const CURRENT_VERSION = "4.3";

function traditionToSimplified(text) {
  const traditionalToSimplified = {
    '戰': '战', '鬥': '斗', '時': '时', '間': '间',
    '傷': '伤', '艦': '舰', '損': '损', '計': '计',
    '統': '统', '結': '结', '報': '报', '數': '数',
    '場': '场', '總': '总', '點': '点', '擊': '击',
    '沉': '沉', '勝': '胜', '敗': '败', '華': '华',
    '義': '义', '開': '开', '關': '关', '並': '并',
    '當': '当', '從': '从', '實': '实', '現': '现',
    '體': '体', '後': '后', '為': '为', '與': '与'
    // 可以根据需要添加更多转换
  };
  
  return text.split('').map(char => traditionalToSimplified[char] || char).join('');
}

function parseData() {
  // 获取文本并转换为简体
  let text = document.body.innerText;
  text = traditionToSimplified(text);
  
  const rows = text.split('\n');
  const battles = [];
  
  for (const row of rows) {
    if (row.includes('战斗时间')) continue;
    
    const parts = row.split('\t');
    if (parts.length === 6) {
      const [minutes, seconds] = parts[4].split(':').map(n => parseInt(n.trim()));
      const durationInMinutes = minutes + seconds/60;
      
      battles.push({
        time: traditionToSimplified(parts[0]),
        ship: traditionToSimplified(parts[1]),
        damage: parseInt(parts[2]),
        sinks: parseInt(parts[3]),
        duration: traditionToSimplified(parts[4]),
        durationInMinutes: durationInMinutes,
        result: traditionToSimplified(parts[5])
      });
    }
  }
  
  // 获取第一条记录的日期作为默认日期
  const targetDate = battles.length > 0 ? battles[0].time.split(' ')[0] : '';
  
  return {
    battles,  // 返回所有战斗数据，不再按日期过滤
    targetDate
  };
}

// 添加存储数据的函数
function storePageData() {
  if (!isExtensionValid()) {
    console.warn('Extension context invalidated, please refresh the page');
    return;
  }

  const { battles, targetDate } = parseData();
  
  try {
    chrome.storage.local.get(['storedBattles'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        return;
      }

      let allBattles = result.storedBattles || [];
      
      const newBattles = battles.filter(newBattle => {
        return !allBattles.some(existingBattle => 
          existingBattle.time === newBattle.time && 
          existingBattle.ship === newBattle.ship &&
          existingBattle.damage === newBattle.damage &&
          existingBattle.sinks === newBattle.sinks &&
          existingBattle.duration === newBattle.duration
        );
      });
      
      if (newBattles.length > 0) {
        allBattles = [...allBattles, ...newBattles];
        
        chrome.storage.local.set({
          storedBattles: allBattles
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Storage set error:', chrome.runtime.lastError);
            return;
          }
          
          const statsInfoDisplay = document.getElementById('statsInfoDisplay');
          const totalRecordsDisplay = document.getElementById('totalRecordsDisplay');
          if (statsInfoDisplay && totalRecordsDisplay) {
            updateStats();
          }
        });
      }
    });
  } catch (error) {
    console.error('Failed to store data:', error);
  }
}

// 添加拖动功能
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  element.style.cursor = 'move';
  element.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // 获取鼠标初始位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // 计算新位置
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // 设置元素新位置
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// 修改版本检查函数，添加日志输出
async function checkVersion() {
  try {
    const response = await fetch('https://api.allorigins.win/raw?url=https://record.nf2.site/version.json');
    const data = await response.json();
    console.log('Version check:', { current: CURRENT_VERSION, latest: data.now });
    return {
      needUpdate: data.now !== CURRENT_VERSION,
      latestVersion: data.now
    };
  } catch (error) {
    console.error('Version check failed:', error);
    return {
      needUpdate: false,
      latestVersion: CURRENT_VERSION
    };
  }
}

// 修改浮动按钮，移除存储按钮
function createFloatingButton() {
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'statsButtonContainer';
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.right = '20px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexDirection = 'column';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.zIndex = '10000';
  buttonContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  buttonContainer.style.padding = '10px';
  buttonContainer.style.borderRadius = '8px';
  buttonContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

  // 添加高亮按钮
  const filterButton = document.createElement('div');
  filterButton.innerHTML = '筛选战绩';
  filterButton.id = 'filterButton';
  filterButton.className = 'stats-button';
  
  // 显示统计按钮
  const statsButton = document.createElement('div');
  statsButton.innerHTML = '显示统计';
  statsButton.id = 'statsButton';
  statsButton.className = 'stats-button';
  
  // 清除数据按钮
  const clearButton = document.createElement('div');
  clearButton.innerHTML = '清除数据';
  clearButton.id = 'clearButton';
  clearButton.className = 'stats-button';

  // 添加总记录数显示
  const totalRecords = document.createElement('div');
  totalRecords.id = 'totalRecordsDisplay';
  totalRecords.className = 'stats-info';

  // 添加详细统计信息
  const statsInfo = document.createElement('div');
  statsInfo.id = 'statsInfoDisplay';
  statsInfo.className = 'stats-info';
  
  buttonContainer.appendChild(filterButton); // 替换原来的 highlightButton
  buttonContainer.appendChild(statsButton);
  buttonContainer.appendChild(clearButton);
  buttonContainer.appendChild(totalRecords);
  buttonContainer.appendChild(statsInfo);
  document.body.appendChild(buttonContainer);
  makeDraggable(buttonContainer);

  // 添加筛选状态标记
  let isFiltering = true;

  // 修改筛选按钮的点击事件
  filterButton.addEventListener('click', () => {
    isFiltering = !isFiltering;
    if (isFiltering) {
      filterBattleRecords();
      filterButton.style.backgroundColor = '#1a73e8';
    } else {
      // 移除所有筛选效果
      const table = document.querySelector('.dt.mtm');
      if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          row.classList.remove('highlight-row', 'high-damage-row', 'hidden-row');
        });
      }
      filterButton.style.backgroundColor = '#666';
    }
  });

  // 自动触发筛选
  setTimeout(filterBattleRecords, 1000);

  // 自动存储当前页面数据并设置观察器
  storePageData();
  setupPageObserver();
  
  // 更新显示的统计信息
  function updateStats() {
    if (!isExtensionValid()) {
      console.warn('Extension context invalidated, please refresh the page');
      return;
    }

    try {
      chrome.storage.local.get(['storedBattles'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          return;
        }

        const allBattles = result.storedBattles || [];
        const totalRecordsDisplay = document.getElementById('totalRecordsDisplay');
        if (totalRecordsDisplay) {
          totalRecordsDisplay.innerHTML = `总存储记录数：${allBattles.length}`;
        }

        if (allBattles.length > 0) {
          const defaultDate = allBattles[0].time.split(' ')[0];
          const filteredBattles = allBattles.filter(battle => 
            battle.time.split(' ')[0] === defaultDate
          );
          const stats = calculateStats(filteredBattles);
          
          const statsInfoDisplay = document.getElementById('statsInfoDisplay');
          if (statsInfoDisplay) {
            statsInfoDisplay.innerHTML = `
              <div>当前计算日期：<span class="highlight-blue">${defaultDate}</span></div>
              <div>总场次：<span class="highlight">${stats.totalGames}</span></div>
              <div>满5分钟的总击沉：<span class="highlight">${stats.over5MinTotalSinks}</span></div>
              <div>满5分钟的总伤害：<span class="highlight">${stats.over5MinTotalDamage.toLocaleString()}</span></div>
              <div>满5分钟且有伤害的胜利场次：<span class="highlight">${stats.over5MinWinsWithDamage}</span></div>
              <div>满5分钟且伤害超过10万的胜利场数：<span class="highlight">${stats.over5MinWinsHighDamage}</span></div>
            `;
          }
        }
      });
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  // 初始更新统计信息
  updateStats();
  
  // 统计按钮事件
  statsButton.addEventListener('click', () => {
    if (!isExtensionValid()) {
      alert('扩展已更新，请刷新页面');
      return;
    }

    chrome.storage.local.get(['storedBattles'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        alert('获取数据失败，请刷新页面重试');
        return;
      }

      if (!result.storedBattles || result.storedBattles.length === 0) {
        alert('没有存储的数据！请先存储页面数据。');
        return;
      }
      
      const defaultDate = result.storedBattles[0].time.split(' ')[0];
      const filteredBattles = result.storedBattles.filter(battle => 
        battle.time.split(' ')[0] === defaultDate
      );
      
      const stats = calculateStats(filteredBattles);
      showStatsPopup(stats, defaultDate, result.storedBattles);
    });
  });
  
  // 清除按钮事件
  clearButton.addEventListener('click', () => {
    if (!isExtensionValid()) {
      alert('扩展已更新，请刷新页面');
      return;
    }

    if (confirm('确定要清除所有存储的数据吗？')) {
      chrome.storage.local.remove(['storedBattles'], () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          alert('清除数据失败，请刷新页面重试');
          return;
        }
        updateStats(); // 清除后更新显示的统计信息
      });
    }
  });

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .stats-info {
      color: #333;
      font-size: 14px;
      margin-top: 5px;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 5px;
      border-radius: 4px;
    }
    .stats-info .highlight {
      color: #d93025;
      font-weight: bold;
    }
    .stats-info .highlight-blue {
      color: #1a73e8;
      font-weight: bold;
    }
    .stats-info div {
      margin: 3px 0;
    }
  `;
  document.head.appendChild(style);
}

function calculateStats(battles) {
  const over5MinBattles = battles.filter(b => b.durationInMinutes >= 5);
  
  // 修改阵营顺序，将乌拉放到铁血后面
  const nations = ['花旗', '雾都', '樱花', '铁血', '乌拉', '凯旋', '撒丁', '炎黄'];
  const shipTypes = ['战列', '战巡', '航母', '轻巡', '驱逐', '潜艇', '装甲舰'];
  
  // 创建阵营-舰种统计矩阵
  const nationShipStats = {};
  shipTypes.forEach(shipType => {
    nationShipStats[shipType] = {};
    nations.forEach(nation => {
      nationShipStats[shipType][nation] = over5MinBattles.filter(b => {
        const shipInfo = b.ship; // 已经是简体
        const result = b.result; // 已经是简体
        
        // 装甲舰特殊判断
        if (shipType === '装甲舰') {
          if (nation === '炎黄') {
            return shipInfo.includes('定远舰') && result === '胜' && b.damage > 0;
          }
          if (nation === '铁血') {
            return shipInfo.includes('装甲') && result === '胜' && b.damage > 0;
          }
          return false;
        }
        
        // 炎黄舰船判断规则
        if (nation === '炎黄') {
          // 根据舰名判断舰种
          const shipTypeMap = {
            '轻巡': ['中山', '重庆'],
            '航母': ['明斯克'],
            '潜艇': ['海龙', '033'],
            '战列': ['明昭'],
            '驱逐': ['民生']
          };
          
          // 检查当前舰种是否有对应的炎黄舰船
          if (shipTypeMap[shipType]) {
            return shipTypeMap[shipType].some(name => shipInfo.includes(name)) && 
                   result === '胜' && 
                   b.damage > 0;
          }
          return false;
        }
        
        // 雾都战巡特殊判断
        if (nation === '雾都' && shipType === '战巡') {
          return shipInfo.includes('雾都战列') && 
                 (shipInfo.includes('81') || shipInfo.includes('86')) && 
                 result === '胜' && 
                 b.damage > 0;
        }
        
        // 如果是雾都战列，需要排除81和86
        if (nation === '雾都' && shipType === '战列') {
          return shipInfo.includes('雾都战列') && 
                 !shipInfo.includes('81') && 
                 !shipInfo.includes('86') && 
                 result === '胜' && 
                 b.damage > 0;
        }
        
        // 常规判断
        return shipInfo.includes(nation) && 
               shipInfo.includes(shipType) && 
               result === '胜' && 
               b.damage > 0;
      }).length;
    });
  });

  // Add mission stats
  const missionStats = {
    nations: {}, // Store nation victories
    shipTypes: {}, // Store ship type victories
    superBattles: 0 // Count super battles with >100k damage
  };

  // Count nation victories
  nations.forEach(nation => {
    if (nation === '炎黄') {
      // 更新炎黄舰船名单
      const validShips = ['定远舰', '中山', '重庆', '明斯克', '海龙', '033', '明昭', '民生'];
      missionStats.nations[nation] = over5MinBattles.filter(b => 
        validShips.some(shipName => b.ship.includes(shipName)) && 
        b.result === '胜' && 
        b.damage > 0
      ).length;
    } else {
      missionStats.nations[nation] = over5MinBattles.filter(b => 
        b.ship.includes(nation) && 
        b.result === '胜' && 
        b.damage > 0
      ).length;
    }
  });

  // Count ship type victories
  shipTypes.forEach(type => {
    if (type === '战巡') {
      // 修改战巡统计逻辑，统计所有国家的战巡
      missionStats.shipTypes[type] = over5MinBattles.filter(b => {
        const shipInfo = b.ship;
        return (
          // 雾都战巡（81和86）
          (shipInfo.includes('雾都战列') && 
           (shipInfo.includes('81') || shipInfo.includes('86'))) ||
          // 其他国家的战巡
          (shipInfo.includes('战巡') && 
           !shipInfo.includes('雾都战列')) // 排除雾都战列以避免重复计算
        ) && b.result === '胜' && b.damage > 0;
      }).length;
    } else if (type === '装甲舰') {
      // 装甲舰特殊处理
      missionStats.shipTypes[type] = over5MinBattles.filter(b => {
        const shipInfo = b.ship;
        return (shipInfo.includes('定远舰') || shipInfo.includes('装甲')) && 
               b.result === '胜' && 
               b.damage > 0;
      }).length;
    } else {
      missionStats.shipTypes[type] = over5MinBattles.filter(b => {
        const shipInfo = b.ship;
        
        // 炎黄特殊舰船的判断
        const specialShipTypes = {
          '轻巡': ['中山', '重庆'],
          '航母': ['明斯克'],
          '潜艇': ['海龙', '033'],
          '战列': ['明昭'],
          '驱逐': ['民生']
        };
        
        // 先检查是否是炎黄特殊舰船
        if (specialShipTypes[type] && 
            specialShipTypes[type].some(name => shipInfo.includes(name))) {
          return b.result === '胜' && b.damage > 0;
        }
        
        // 如果不是炎黄舰船，使用常规判断
        return shipInfo.includes(type) && 
               b.result === '胜' && 
               b.damage > 0;
      }).length;
    }
  });

  // Count super battles
  missionStats.superBattles = over5MinBattles.filter(b => 
    b.result === '胜' && b.damage > 100000
  ).length;

  return {
    totalGames: battles.length,
    gamesOver5Min: over5MinBattles.length,
    totalDamage: battles.reduce((sum, b) => sum + b.damage, 0),
    totalSinks: battles.reduce((sum, b) => sum + b.sinks, 0),
    over5MinTotalSinks: over5MinBattles.reduce((sum, b) => sum + b.sinks, 0),
    over5MinTotalDamage: over5MinBattles.reduce((sum, b) => sum + b.damage, 0),
    over5MinWinsWithDamage: over5MinBattles.filter(b => b.result === '胜' && b.damage > 0).length,
    over5MinWinsHighDamage: over5MinBattles.filter(b => b.result === '胜' && b.damage > 100000).length,
    nationShipStats: nationShipStats,
    missionStats
  };
}

function showStatsPopup(stats, targetDate, allBattles) {
  let existingPopup = document.getElementById('statsPopup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement('div');
  popup.id = 'statsPopup';
  
  // 确保使用相同的阵营顺序
  const nations = ['花旗', '雾都', '樱花', '铁血', '乌拉', '凯旋', '撒丁', '炎黄'];
  const shipTypes = ['战列', '战巡', '航母', '轻巡', '驱逐', '潜艇', '装甲舰'];
  
  // 计算每个阵营的总胜利场次
  const nationTotals = nations.map(nation => {
    const total = shipTypes.reduce((sum, shipType) => 
      sum + stats.nationShipStats[shipType][nation], 0);
    return total;
  });

  const tableHTML = `
    <div class="stats-explanation">
      以下统计均为：满五分钟且有伤害的胜利场次
    </div>
    <table class="stats-table">
      <tr>
        <th>舰种\\阵营</th>
        ${nations.map(nation => `<th>${nation}</th>`).join('')}
        <th>胜场总计</th>
      </tr>
      ${shipTypes.map(shipType => {
        const totalForShipType = nations.reduce((sum, nation) => 
          sum + stats.nationShipStats[shipType][nation], 0);
        
        return `
          <tr>
            <td>${shipType}</td>
            ${nations.map(nation => {
              const value = stats.nationShipStats[shipType][nation];
              return `<td class="${value === 0 ? '' : value < 3 ? 'non-zero' : 'highlight'}">${value === 0 ? '-' : value}</td>`;
            }).join('')}
            <td class="total-column">${totalForShipType === 0 ? '-' : totalForShipType}</td>
          </tr>
        `;
      }).join('')}
      <tr class="nation-totals">
        <td>阵营胜场</td>
        ${nationTotals.map(total => 
          `<td>${total === 0 ? '-' : total}</td>`
        ).join('')}
        <td>${nationTotals.reduce((a, b) => a + b, 0)}</td>
      </tr>
    </table>
  `;

  // Add missions panel HTML
  const missionsHTML = `
    <div class="missions-panel">
      <h3>任务状态</h3>
      <div class="missions-container">
        <div class="mission-section">
          <h4>国籍任务</h4>
          ${nations.map(nation => {
            const count = stats.missionStats.nations[nation];
            const isCompleted = count >= 3;
            return `
              <div class="mission-item ${isCompleted ? 'completed' : ''}">
                <span class="mission-status">●</span>
                ${nation}3胜，5奖章
                <span class="mission-count ${isCompleted ? 'completed' : ''}" data-count="${count}">(${count}/3)</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="mission-section">
          <h4>超级战役，10万伤害</h4>
          ${[1, 5, 10, 20, 30, 40, 50].map(requirement => {
            const count = stats.missionStats.superBattles;
            const isCompleted = count >= requirement;
            const reward = {
              1: '1胜，10万海币',
              5: '5胜，20万海点',
              10: '10胜，1超精战',
              20: '20胜，1超精轮',
              30: '30胜，1针',
              40: '40胜，4熟练100装',
              50: '50胜，1英雄兵'
            }[requirement];
            return `
              <div class="mission-item ${isCompleted ? 'completed' : ''}">
                <span class="mission-status">●</span>
                ${reward}
                <span class="mission-count ${isCompleted ? 'completed' : ''}" data-count="${count}">(${count}/${requirement})</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="mission-section">
          <h4>舰种任务</h4>
          ${shipTypes.map(type => {
            const count = stats.missionStats.shipTypes[type];
            const isCompleted = count >= 5;
            return `
              <div class="mission-item ${isCompleted ? 'completed' : ''}">
                <span class="mission-status">●</span>
                ${type}5场，5奖章
                <span class="mission-count ${isCompleted ? 'completed' : ''}" data-count="${count}">(${count}/5)</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  popup.innerHTML = `
    <div class="stats-content">
      <div class="stats-header">
        <h3 style="color: black;">请在顶部调整成简体 
          <span style="color: #1a73e8; margin-left: 10px;">当前版本: ${CURRENT_VERSION}</span>
          <span id="updateButtonContainer" style="display: inline-block; margin-left: 10px;"></span>
        </h3>
        <p style="color: red; display: inline-block; margin-left: 10px;"><h3><a href="https://navy.nf2.site" style="color: red; text-decoration: none;">海战战绩统计</a></h3></p>
        <a href="https://navy.nf2.site" style="color: blue; display: inline-block; margin-left: 10px; text-decoration: none;"><h3>海战生态</h3></a>

        <div class="date-input-container">
          <input type="date" id="statsDate" value="${targetDate}" />
          <button id="changeDateBtn">计新日期</button>
        </div>
      </div>
      <div class="stats-body">
        <div class="stats-left">
          <div class="detailed-stats">
            <p style="color: black;">当前计算日期 : <span class="highlight1" style="color: blue;">${targetDate}</span></p>
            <p style="color: black;">总场次 : <span class="highlight" style="color: red;">${stats.totalGames}</span></p>
            <p style="color: black;">满5分钟的总击沉 : <span class="highlight" style="color: red;">${stats.over5MinTotalSinks}</span></p>
            <p style="color: black;">满5分钟的总伤害 : <span class="highlight" style="color: red;">${stats.over5MinTotalDamage.toLocaleString()}</span></p>
            <p style="color: black;">满5分钟且有伤害的胜利场次 : <span class="highlight" style="color: red;">${stats.over5MinWinsWithDamage}</span></p>
            <p style="color: black;">满5分钟且伤害超过10万的胜利场数 : <span class="highlight" style="color: red;">${stats.over5MinWinsHighDamage}</span></p>
          </div>
          <div class="ship-stats">
            ${tableHTML}
          </div>
        </div>
        ${missionsHTML}
      </div>
      <div class="button-group">
        <button id="fullCalcButton" class="full-calc-btn" style="color: black;">分页完整算</button>
        <button id="closeStats1" style="color: yellow;">总存储记录数：${allBattles.length}</button>
        <button id="closeStats" style="color: black;">关闭</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // 修改日期更改事件监听
  document.getElementById('changeDateBtn').addEventListener('click', () => {
    const newDate = document.getElementById('statsDate').value;
    if (newDate) {
      const filteredBattles = allBattles.filter(battle => 
        battle.time.split(' ')[0] === newDate
      );
      
      if (filteredBattles.length === 0) {
        alert('所选日期没有战斗数据！');
        return;
      }
      
      const newStats = calculateStats(filteredBattles);
      
      // 移除当前弹窗并显示新的统计数据
      document.getElementById('statsPopup').remove();
      showStatsPopup(newStats, newDate, allBattles);
    }
  });

  // 更新样式
  const style = document.createElement('style');
  style.textContent = `
    #statsPopup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #ffffff;
      padding: 0;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 10001;
      max-height: 95vh;
      overflow-y: auto;
    }

    #statsPopup .stats-content {
      min-width: 1000px;
      max-height: 95vh;
      overflow-y: auto;
    }

    .detailed-stats, .ship-stats {
      padding: 12px 20px;
    }

    .detailed-stats {
      background-color: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .detailed-stats p {
      margin: 6px 0;
      line-height: 1.3;
    }

    .stat-explanation {
      color: #5f6368;
      font-size: 0.9em;
      text-align: center;
      margin: 4px 0 8px 0;
    }

    .stats-table {
      margin: 8px 0 12px 0;
    }

    .button-group {
      display: flex;
      gap: 8px;
      margin: 0px 0 10px 0;
      padding: 0 20px;
    }

    .stats-content {
      padding-bottom: 15px;
    }

    .stats-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      margin: 10px 0;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    
    .stats-table th,
    .stats-table td {
      padding: 8px 4px;
      font-size: 0.9em;
      border-right: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stats-table th:first-child,
    .stats-table td:first-child {
      width: 80px;
    }

    .stats-table th:last-child,
    .stats-table td:last-child {
      width: 80px;
    }

    .stats-table th:not(:first-child):not(:last-child),
    .stats-table td:not(:first-child):not(:last-child) {
      width: calc((100% - 160px) / 7);
    }

    #statsPopup h3 {
      margin: 0;
      text-align: center;
      font-size: 1.3em;
      background-color: #f0f8f0;
      padding: 15px;
      border-radius: 12px 12px 0 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .detailed-stats, .ship-stats {
      padding: 1px;
    }

    #closeStats {
      background-color: #4CAF50 !important;
      color: white !important;
    }

    #closeStats:hover {
      background-color: #45a049 !important;
    }

    #closeStats1 {
      background-color: #2ae8af !important;
      color: #db0b0b !important;
    }

    #closeStats1:hover {
      background-color: #45a049 !important;
    }

    .detailed-stats {
      background-color: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 0px;
    }

    .detailed-stats p {
      margin: 8px 0;
      line-height: 1.4;
    }

    .stats-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 10px 0;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    
    .stats-table th,
    .stats-table td {
      padding: 8px;
      font-size: 0.9em;
      border-right: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;
    }

    .stats-table th {
      background-color: #f1f3f4;
      font-weight: 600;
    }

    .stats-table td.highlight {
      color: #d93025;
    }

    .stats-table .total-column {
      background-color: #f8f9fa;
      font-weight: 600;
      color: #2e7d32 !important;
    }

    .nation-totals {
      background-color: #f1f3f4;
      font-weight: 600;
    }

    .nation-totals td {
      color: #2e7d32 !important;
    }

    .nation-totals td:first-child {
      color: black !important;
    }

    .button-group {
      display: flex;
      gap: 8px;
      margin: 0px 0 10px 0;
      padding: 0 20px;
    }

    .button-group button {
      flex: 1;
      padding: 6px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .full-calc-btn {
      background-color: #1a73e8;
      color: white;
    }

    .stat-explanation {
      color: #5f6368;
      font-size: 0.9em;
      text-align: center;
      margin: 8px 0;
    }

    .highlight {
      color: #d93025;
      font-weight: 500;
      font-size: 18px;
    }
    .highlight1 {
      color: #d93025;
      font-weight: 500;
    }

    .stats-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1px;
      background-color: #f0f8f0;
      border-radius: 12px 12px 0 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .stats-header h3 {
      margin: 0;
    }

    .date-input-container {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    #statsDate {
      padding: 5px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }

    #changeDateBtn {
      padding: 5px 15px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s;
    }

    #changeDateBtn:hover {
      background-color: #45a049;
    }

    .stats-content {
      padding-bottom: 20px;
    }

    .stats-content {
      display: flex;
      flex-direction: column;
      min-width: 1600px;
      height: auto;
      max-height: 95vh;
      overflow-y: auto;
    }

    .stats-body {
      display: flex;
      padding: 20px;
      gap: 20px;
      height: auto;
      min-height: auto;
    }

    .stats-left {
      flex: 1;
    }

    .missions-container {
      display: flex;
      gap: 20px;
      justify-content: space-between;
    }

    .missions-panel {
      width: auto;
      min-width: 350px;
      background: #f8f9fa;
      padding: 15px;
      max-height: none;
      overflow-y: visible;
    }

    .mission-section {
      flex: 1;
      min-width: 190px;
      margin-bottom: 30px;
    }

    .mission-count.completed {
      color: #4CAF50;
      font-weight: bold;
    }

    .mission-item.completed {
      color: #ed290c;
      font-weight: bold;
    }

    .mission-item.completed .mission-status {
      color: #ed290c;
    }

    .missions-container {
      max-height: none;
      overflow-y: visible;
    }

    .mission-item {
      margin: 4px 0;
      line-height: 1.4;
    }

    .stats-explanation {
      background-color: #f8f9fa;
      color: #333;
      padding: 12px;
      margin-bottom: 10px;
      text-align: center;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #e0e0e0;
    }

    .stats-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .detailed-stats {
      margin-bottom: 0;
    }

    .stats-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      margin: 10px 0;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    
    .stats-table th,
    .stats-table td {
      padding: 8px 4px;
      font-size: 0.9em;
      border-right: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stats-table th:first-child,
    .stats-table td:first-child {
      width: 80px;  /* 第一列固定宽度 */
    }

    .stats-table th:last-child,
    .stats-table td:last-child {
      width: 58px;  /* 最后一列固定宽度 */
    }

    .stats-table th:not(:first-child):not(:last-child),
    .stats-table td:not(:first-child):not(:last-child) {
      width: calc((100% - 180px) / 8);  /* 平均分配剩余宽度给中间8列 */
    }

    .stats-left {
      flex: 1;
      width: 100%;
      min-width: 541px;  /* 确保最小宽度 */
    }

    .ship-stats {
      width: 100%;
    }

    .stats-explanation {
      width: 100%;
    }

    .stats-body {
      display: flex;
      padding: 10px;
      gap: 10px;
      min-height: auto;
    }

    .detailed-stats {
      padding: 8px;
      margin-bottom: 8px;
    }

    .detailed-stats p {
      margin: 4px 0;
      line-height: 1.2;
    }

    .missions-panel {
      padding: 15px;
      max-height: none;
      overflow-y: visible;
    }

    .missions-container {
      gap: 10px;
    }

    .mission-section {
      margin-bottom: 15px;
    }

    .mission-item {
      font-size: 1.2em;
      padding: 3px 0;
      line-height: 1.5;
    }

    .mission-section h4 {
      font-size: 1.2em;
      margin: 10px 0;
    }

    .stats-table th,
    .stats-table td {
      padding: 8px 4px;
      font-size: 1.1em;
    }

    .mission-count {
      font-size: 1.1em;
    }

    .mission-item.completed {
      font-size: 1.1em;
      font-weight: 500;
    }

    .mission-status {
      font-size: 1.2em;
      vertical-align: middle;
    }

    .stats-table th {
      font-weight: 600;
      font-size: 1.15em;
    }

    .nation-totals td {
      font-size: 1.15em;
      font-weight: 600;
    }

    // 调整左右两边的宽度比例
    .stats-left {
      flex: 0; // 增加左侧比，原来是1
      min-width: 1000px; // 增加最小宽度
    }

    .missions-panel {
      min-width: 350px; // 减小右侧最小宽度，原来是350px
      width: auto;
      flex: 1; // 添加flex比例
    }

    // 确保mission items内容合适换行
    .mission-item {
      white-space: nowrap; // 防止任务文本换行
      overflow: hidden;
      text-overflow: ellipsis;
    }

    // 调整整体布局的flex容器
    .stats-body {
      display: flex;
      gap: 15px;
      justify-content: space-between; // 确保两边分布
    }

    .stats-table td.highlight {
      color: #d93025;
    }

    .stats-table td.non-zero {
      color: #1a73e8;
    }

    .mission-count {
        font-size: 1.1em;
    }

    .mission-count.completed {
        color: #ea0505;
        font-weight: bold;
    }

    /* Add new style for non-zero counts that aren't completed */
    .mission-count:not(.completed) {
        color: #1a73e8;  /* Blue color for non-zero, non-completed counts */
    }

    /* Keep zero counts in default color */
    .mission-count[data-count="0"] {
        color: inherit;
    }

    .total-records {
      position: absolute;
      bottom: 15px;
      right: 20px;
      color: #666;
      font-size: 0.9em;
      padding: 5px 10px;
      background-color: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .button-group {
      margin-right: 0px; /* 为总记录数留出空间 */
    }
  `;
  
  document.head.appendChild(style);
  
  // 事件监听器
  document.getElementById('closeStats').addEventListener('click', () => {
    popup.remove();
  });

  document.getElementById('fullCalcButton').addEventListener('click', () => {
    window.open('https://nf2.site/count', '_blank');
  });

  // 检查版本并添加更新按钮
  checkVersion().then(({needUpdate, latestVersion}) => {
    if (needUpdate) {
      const updateButtonContainer = document.getElementById('updateButtonContainer');
      if (updateButtonContainer) {
        const updateButton = document.createElement('a');
        updateButton.href = 'https://record.nf2.site/';
        updateButton.target = '_blank';
        updateButton.style.backgroundColor = '#ff4081';
        updateButton.style.color = 'white';
        updateButton.style.padding = '2px 8px';
        updateButton.style.borderRadius = '4px';
        updateButton.style.textDecoration = 'none';
        updateButton.style.fontSize = '0.8em';
        updateButton.innerHTML = `更新到 ${latestVersion}`;
        updateButtonContainer.appendChild(updateButton);
      }
    }
  });
}

// 修改 setupPageObserver 函数
function setupPageObserver() {
  let lastUrl = location.href;
  
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (document.body.innerText.includes('战斗时间')) {
        setTimeout(() => {
          storePageData();
          filterBattleRecords(); // 自动触发筛选
        }, 1000);
      }
    }
  });

  const config = {
    childList: true,
    subtree: true
  };

  urlObserver.observe(document.body, config);

  const originalXHR = window.XMLHttpRequest;
  function newXHR() {
    const xhr = new originalXHR();
    xhr.addEventListener('load', function() {
      if (document.body.innerText.includes('战斗时间')) {
        setTimeout(() => {
          storePageData();
          filterBattleRecords(); // 自动触发筛选
        }, 1000);
      }
    });
    return xhr;
  }
  window.XMLHttpRequest = newXHR;
}

// 修改初始化代码
if (window.location.href.startsWith('https://club.navyfield.com.hk/plugin.php')) {
  // 等待页面完全加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }
}

// 移除之前的 DOMContentLoaded 事件监听器
// document.addEventListener('DOMContentLoaded', () => {...});

// 保留原有的消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    const { battles, targetDate } = parseData();
    sendResponse({
      battles,
      targetDate
    });
  }
});

// 添加按钮样式
const buttonStyle = `
  .stats-button {
    background-color: #1a73e8;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-size: 15px;
    transition: all 0.3s ease;
    user-select: none;
  }

  #statsButtonContainer {
    transition: none !important;
  }

  .stats-button {
    background-color: #1a73e8;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-size: 15px;
    transition: all 0.3s ease;
  }

  .stats-button:hover {
    background-color: #1557b0;
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(0,0,0,0.15);
  }

  #storeButton {
    background-color: #4CAF50;
  }

  #storeButton:hover {
    background-color: #45a049;
  }

  #clearButton {
    background-color: #dc3545;
  }

  #clearButton:hover {
    background-color: #c82333;
  }

  .update-button {
    background-color: #ff4081 !important;
  }

  .update-button:hover {
    background-color: #f50057 !important;
  }
`;

// 在文件末尾注入样式
const style = document.createElement('style');
style.textContent = buttonStyle;
document.head.appendChild(style); 

// 添加一个辅助函数来检查扩展是否有效
function isExtensionValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
} 

// 修改高亮战绩的函数名和逻辑
function filterBattleRecords() {
  // 获取表格
  const table = document.querySelector('.dt.mtm');
  if (!table) return;

  // 获取所有行
  const rows = table.querySelectorAll('tr');
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .highlight-row {
      background-color: rgba(255, 0, 0, 0.1) !important;
      transition: background-color 0.3s ease;
    }
    .highlight-row:hover {
      background-color: rgba(255, 0, 0, 0.2) !important;
    }
    .high-damage-row {
      background-color: rgba(0, 0, 255, 0.1) !important;
      transition: background-color 0.3s ease;
    }
    .high-damage-row:hover {
      background-color: rgba(0, 0, 255, 0.2) !important;
    }
    .number-column {
      width: 40px;
      text-align: center;
      padding: 8px 4px !important;
    }
    .total-number-column {
      width: 40px;
      text-align: center;
      padding: 8px 4px !important;
      background-color: #f5f5f5;
    }
  `;
  document.head.appendChild(style);

  // 先移除已存在的序号列
  rows.forEach(row => {
    const totalNumberCell = row.querySelector('.total-number-column');
    const numberCell = row.querySelector('.number-column');
    if (totalNumberCell) totalNumberCell.remove();
    if (numberCell) numberCell.remove();
  });

  let validRowCount = 0; // 用于计数有效行

  // 处理表头：添加两个序号列
  if (rows.length > 0) {
    const headerRow = rows[0];
    
    // 添加总序号列
    const totalNumberHeader = document.createElement('th');
    totalNumberHeader.textContent = '总序';
    totalNumberHeader.className = 'total-number-column';
    headerRow.insertBefore(totalNumberHeader, headerRow.firstChild);
    
    // 添加筛选序号列
    const numberHeader = document.createElement('th');
    numberHeader.textContent = '序号';
    numberHeader.className = 'number-column';
    headerRow.insertBefore(numberHeader, headerRow.firstChild.nextSibling);
  }

  // 遍历每一行（跳过表头）
  rows.forEach((row, index) => {
    if (index === 0) return; // 跳过表头

    // 添加总序号列
    const totalNumberCell = document.createElement('td');
    totalNumberCell.className = 'total-number-column';
    totalNumberCell.textContent = index; // 从1开始的总序号
    row.insertBefore(totalNumberCell, row.firstChild);
    
    // 添加筛选序号列
    const numberCell = document.createElement('td');
    numberCell.className = 'number-column';
    row.insertBefore(numberCell, totalNumberCell.nextSibling);

    const cells = row.querySelectorAll('td');
    if (cells.length >= 8) { // 现在有8列，因为我们添加了两个序号列
      const damage = parseInt(cells[4].textContent); // 索引需要调整，因为添加了新列
      const duration = cells[6].textContent;
      const result = cells[7].textContent;

      // 解析时长
      const [minutes, seconds] = duration.split(':').map(n => parseInt(n.trim()));
      const durationInMinutes = minutes + seconds/60;

      // 移除之前的所有高亮类
      row.classList.remove('highlight-row', 'high-damage-row');

      // 检查条件：伤害>0，时长>5分钟，结果为胜
      if (damage > 0 && durationInMinutes >= 5 && result.includes('胜')) {
        validRowCount++;
        
        // 设置筛选序号
        numberCell.textContent = validRowCount;

        // 根据伤害值决定高亮颜色
        if (damage >= 100000) {
          row.classList.add('high-damage-row');
        } else {
          row.classList.add('highlight-row');
        }
      }
    }
  });
} 