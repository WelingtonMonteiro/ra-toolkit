/**
 * Console id to name/icon lookup for game rows.
 */

// From RAWeb config/systems.php
var consoleIdMap = {
  1:{s:'MD',i:'md'},2:{s:'N64',i:'n64'},3:{s:'SNES',i:'snes'},4:{s:'GB',i:'gb'},
  5:{s:'GBA',i:'gba'},6:{s:'GBC',i:'gbc'},7:{s:'NES',i:'nes'},8:{s:'PCE',i:'pce'},
  9:{s:'SCD',i:'scd'},10:{s:'32X',i:'32-x'},11:{s:'SMS',i:'sms'},12:{s:'PS1',i:'ps1'},
  13:{s:'Lynx',i:'lynx'},14:{s:'NGP',i:'ngp'},15:{s:'GG',i:'gg'},16:{s:'GC',i:'gc'},
  17:{s:'JAG',i:'jag'},18:{s:'DS',i:'ds'},19:{s:'Wii',i:'wii'},20:{s:'WiiU',i:'wii-u'},
  21:{s:'PS2',i:'ps2'},22:{s:'Xbox',i:'xbox'},23:{s:'MO2',i:'mo-2'},24:{s:'MINI',i:'mini'},
  25:{s:'2600',i:'2600'},27:{s:'ARC',i:'arc'},28:{s:'VB',i:'vb'},29:{s:'MSX',i:'msx'},
  33:{s:'SG1K',i:'sg-1-k'},37:{s:'CPC',i:'cpc'},38:{s:'A2',i:'a2'},39:{s:'SAT',i:'sat'},
  40:{s:'DC',i:'dc'},41:{s:'PSP',i:'psp'},43:{s:'3DO',i:'3-do'},44:{s:'CV',i:'cv'},
  45:{s:'INTV',i:'intv'},46:{s:'VECT',i:'vect'},47:{s:'80/88',i:'8088'},49:{s:'PC-FX',i:'pc-fx'},
  51:{s:'7800',i:'7800'},53:{s:'WS',i:'ws'},56:{s:'NGCD',i:'ngcd'},57:{s:'CHF',i:'chf'},
  63:{s:'WSV',i:'wsv'},69:{s:'DUCK',i:'duck'},71:{s:'ARD',i:'ard'},72:{s:'WASM4',i:'wasm-4'},
  73:{s:'A2001',i:'a2001'},74:{s:'VC4000',i:'vc-4000'},75:{s:'ELEK',i:'elek'},
  76:{s:'PCCD',i:'pccd'},77:{s:'JCD',i:'jcd'},78:{s:'DSi',i:'dsi'},80:{s:'UZE',i:'uze'},
  81:{s:'FDS',i:'fds'},102:{s:'EXE',i:'exe'}
};

export function getConsoleInfo(consoleId) {
  var entry = consoleIdMap[consoleId];
  if (entry) {
    return {
      shortName: entry.s,
      iconUrl: 'https://static.retroachievements.org/assets/images/system/' + entry.i + '.png'
    };
  }
  return { shortName: '', iconUrl: 'https://static.retroachievements.org/assets/images/system/unknown.png' };
}
