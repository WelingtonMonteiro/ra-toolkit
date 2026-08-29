/**
 * Where to look for a ROM, per console.
 */

import { RAConsole } from './consoles.js';

// =========================================
//        ROM Collection Dictionaries
// =========================================

export const archiveCollectionDict = {
  [RAConsole.SATURN]: {
    name: "Redump Sega Saturn 2018",
    url: "https://archive.org/download/SegaSaturn2018July10"
  },
  [RAConsole.DREAMCAST]: {
    name: "CHD-ZSTD - Sega Dreamcast (Redump)",
    url: "https://archive.org/download/dc-chd-zstd-redump/dc-chd-zstd"
  },
  [RAConsole.SEGACD]: {
    name: "Redump Sega Mega CD & Sega CD",
    url: "https://archive.org/download/redump.sega_megacd-segacd"
  },
  [RAConsole.NEOGEOCD]: {
    name: "[REDUMP] Disc Image Collection: SNK - Neo Geo CD",
    url: "https://archive.org/download/redump.ngcd.revival"
  },
  [RAConsole.ATARI2600]: {
    name: "No-Intro Atari 2600",
    url: "https://archive.org/download/nointro2600atarii"
  },
  [RAConsole.NINTENDODS]: {
    name: "No-Intro Nintendo DS Decrypted",
    url: "https://archive.org/download/noIntroNintendoDsDecrypted2019Jun30"
  },
  [RAConsole.APPLEII]: {
    name: "Apple 2 TOSEC 2012",
    url: "https://archive.org/details/Apple_2_TOSEC_2012_04_23"
  }
};

export const myrientCollectionDict = {
  // CDs and DVDs files
  [RAConsole.PS1]: {
    name: "chd_psx",
    urls: [
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx/CHD-PSX-USA/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_eur/CHD-PSX-EUR/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_jap/CHD-PSX-JAP/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_jap_p2/CHD-PSX-JAP/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_psx_misc/CHD-PSX-Misc/"
    ]
  },
  [RAConsole.PSP]: {
    name: "psp-chd-zstd-redump",
    urls: [
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/psp-chd-zstd-redump-part1/psp-chd-zstd/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/psp-chd-zstd-redump-part2/psp-chd-zstd/",
    ]
  },
  [RAConsole.PS2]: {
    name: "Sony - PlayStation 2",
    urls: [
      "https://myrient.erista.me/files/Redump/Sony%20-%20PlayStation%202/"
    ]
  },
  [RAConsole.SATURN]: {
    name: "chd_saturn",
    urls: [
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_saturn/CHD-Saturn/USA/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_saturn/CHD-Saturn/Japan/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_saturn/CHD-Saturn/Europe/"
    ]
  },
  [RAConsole.DREAMCAST]: {
    name: "dc-chd-zstd",
    urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/dc-chd-zstd-redump/dc-chd-zstd/"]
  },
  [RAConsole.GAMECUBE]: {
    name: "Nintendo - GameCube - NKit RVZ [zstd-19-128k]",
    urls: ["https://myrient.erista.me/files/Redump/Nintendo%20-%20GameCube%20-%20NKit%20RVZ%20%5Bzstd-19-128k%5D/"]
  },
  [RAConsole.WII]: {
    name: "Nintendo - Wii - NKit RVZ [zstd-19-128k]",
    urls: ["https://myrient.erista.me/files/Redump/Nintendo%20-%20Wii%20-%20NKit%20RVZ%20%5Bzstd-19-128k%5D/"]
  },
  [RAConsole.SEGACD]: {
    name: "chd_segacd",
    urls: [
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_segacd/CHD-SegaCD-NTSC/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_segacd/CHD-MegaCD-NTSCJ/",
      "https://myrient.erista.me/files/Internet%20Archive/chadmaster/chd_segacd/CHD-MegaCD-PAL/",
    ]
  },
  [RAConsole.P3DO]: {
    name: "3do-chd-zstd",
    urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/3do-chd-zstd-redump/3do-chd-zstd/"]
  },
  [RAConsole.ATARIJAGUARCD]: {
    name: "jagcd-chd-zstd",
    urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/jagcd-chd-zstd/jagcd-chd-zstd/"]
  },
  [RAConsole.NEOGEOCD]: {
    name: "ngcd-chd-zstd",
    urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/ngcd-chd-zstd-redump/ngcd-chd-zstd/"]
  },
  [RAConsole.PCENGINECD]: {
    name: "pcecd-chd-zstd",
    urls: ["https://myrient.erista.me/files/Internet%20Archive/chadmaster/pcecd-chd-zstd-redump/pcecd-chd-zstd/"]
  },
  [RAConsole.PCFX]: {
    name: "PC-FX",
    urls: ["https://myrient.erista.me/files/Redump/NEC%20-%20PC-FX%20%26%20PC-FXGA/"]
  },
  // Cartridge roms
  [RAConsole.ARDUBOY]: {
    name: "Arduboy",
    urls: ["https://myrient.erista.me/files/No-Intro/Arduboy%20Inc%20-%20Arduboy/"]
  },
  [RAConsole.ATARI2600]: {
    name: "Atari - 2600",
    urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%202600/"]
  },
  [RAConsole.ATARI7800]: {
    name: "Atari - 7800",
    urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%207800/"]
  },
  [RAConsole.ATARIJAGUAR]: {
    name: "Atari - Jaguar (ROM)",
    urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%20Jaguar%20%28ROM%29/"]
  },
  [RAConsole.ATARILYNX]: {
    name: "Atari - Lynx (LYX)",
    urls: ["https://myrient.erista.me/files/No-Intro/Atari%20-%20Lynx%20%28LYX%29/"]
  },
  [RAConsole.WONDERSWAN]: {
    name: "Wonderswan",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Bandai%20-%20WonderSwan/",
      "https://myrient.erista.me/files/No-Intro/Bandai%20-%20WonderSwan%20Color/"
    ]
  },
  [RAConsole.COLECO]: {
    name: "Coleco - ColecoVision",
    urls: ["https://myrient.erista.me/files/No-Intro/Coleco%20-%20ColecoVision/"]
  },
  [RAConsole.ARCADIA]: {
    name: "Emerson - Arcadia 2001",
    urls: ["https://myrient.erista.me/files/No-Intro/Emerson%20-%20Arcadia%202001/"]
  },
  [RAConsole.FAIRCHILD]: {
    name: "Fairchild - Channel F",
    urls: ["https://myrient.erista.me/files/No-Intro/Fairchild%20-%20Channel%20F/"]
  },
  [RAConsole.VECTREX]: {
    name: "GCE - Vectrex",
    urls: ["https://myrient.erista.me/files/No-Intro/GCE%20-%20Vectrex/"]
  },
  [RAConsole.MAGNAVOXODYSSEY2]: {
    name: "Magnavox - Odyssey 2",
    urls: ["https://myrient.erista.me/files/No-Intro/Magnavox%20-%20Odyssey%202/"]
  },
  [RAConsole.INTELLIVISION]: {
    name: "Mattel - Intellivision",
    urls: ["https://myrient.erista.me/files/No-Intro/Mattel%20-%20Intellivision/"]
  },
  [RAConsole.INTERTONVC4000]: {
    name: "Interton - VC 4000",
    urls: ["https://myrient.erista.me/files/No-Intro/Interton%20-%20VC%204000/"]
  },
  [RAConsole.MEGADUCK]: {
    name: "Welback - Mega Duck",
    urls: ["https://myrient.erista.me/files/No-Intro/Welback%20-%20Mega%20Duck/"]
  },
  [RAConsole.MSX]: {
    name: "Microsoft - MSX",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Microsoft%20-%20MSX/",
      "https://myrient.erista.me/files/No-Intro/Microsoft%20-%20MSX2/"
    ]
  },
  [RAConsole.NEC8800]: {
    name: "Neo Kobe - NEC PC-8801 (2016-02-25)",
    urls: [
      "https://ia801307.us.archive.org/view_archive.php?archive=/35/items/Neo_Kobe_NEC_PC-8001_2016-02-25/Neo%20Kobe%20-%20NEC%20PC-8001%20%282016-02-25%29.zip",
      "https://ia801305.us.archive.org/view_archive.php?archive=/32/items/Neo_Kobe_NEC_PC-8801_2016-02-25/Neo%20Kobe%20-%20NEC%20PC-8801%20%282016-02-25%29.zip"
    ]
  },
  [RAConsole.PCENGINE]: {
    name: "NEC - PC Engine SuperGrafx",
    urls: [
      "https://myrient.erista.me/files/No-Intro/NEC%20-%20PC%20Engine%20-%20TurboGrafx-16/",
      "https://myrient.erista.me/files/No-Intro/NEC%20-%20PC%20Engine%20SuperGrafx/"
    ]
  },
  [RAConsole.NES]: {
    name: "Nintendo - Nintendo Entertainment System (Headered)",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20Entertainment%20System%20%28Headered%29/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Family%20Computer%20Disk%20System%20%28FDS%29/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20Entertainment%20System%20%28Headered%29%20%28Private%29/"
    ]
  },
  [RAConsole.GAMEBOY]: {
    name: "Nintendo - Game Boy",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy/"]
  },
  [RAConsole.GAMEBOYADVANCE]: {
    name: "Nintendo - Game Boy Advance",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Advance/"]
  },
  [RAConsole.GAMEBOYCOLOR]: {
    name: "Nintendo - Game Boy Color",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Color/"]
  },
  [RAConsole.NINTENDO64]: {
    name: "Nintendo - Nintendo 64 (BigEndian)",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%2064%20%28BigEndian%29/"]
  },
  [RAConsole.NINTENDODS]: {
    name: "Nintendo - Nintendo DS (Decrypted)",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DS%20%28Decrypted%29/"]
  },
  [RAConsole.NINTENDODSI]: {
    name: "Nintendo - Nintendo DSi (Digital)",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DSi%20%28Digital%29/"]
  },
  [RAConsole.POKEMINI]: {
    name: "Nintendo - Pokemon Mini",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Pokemon%20Mini/"]
  },
  [RAConsole.SNES]: {
    name: "Nintendo - Super Nintendo Entertainment System",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System%20%28Private%29/"
    ]
  },
  [RAConsole.VIRTUALBOY]: {
    name: "Nintendo - Virtual Boy",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Virtual%20Boy/"]
  },
  [RAConsole.NEOGEOPOCKET]: {
    name: "SNK - NeoGeo Pocket Color",
    urls: [
      "https://myrient.erista.me/files/No-Intro/SNK%20-%20NeoGeo%20Pocket%20Color/",
      "https://myrient.erista.me/files/No-Intro/SNK%20-%20NeoGeo%20Pocket/"
    ]
  },
  [RAConsole.SEGA32X]: {
    name: "Sega - 32X",
    urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%2032X/"]
  },
  [RAConsole.GAMEGEAR]: {
    name: "Sega - Game Gear",
    urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%20Game%20Gear/"]
  },
  [RAConsole.MASTERSYSTEM]: {
    name: "Sega - Master System - Mark III",
    urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%20Master%20System%20-%20Mark%20III/"]
  },
  [RAConsole.MEGADRIVE]: {
    name: "Sega - Mega Drive - Genesis",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Sega%20-%20Mega%20Drive%20-%20Genesis/",
      "https://myrient.erista.me/files/No-Intro/Sega%20-%20Mega%20Drive%20-%20Genesis%20%28Private%29/"
    ]
  },
  [RAConsole.SG1000]: {
    name: "Sega - SG-1000",
    urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%20SG-1000/"]
  },
  [RAConsole.WATARA]: {
    name: "Watara - Supervision",
    urls: ["https://myrient.erista.me/files/No-Intro/Watara%20-%20Supervision/"]
  },
  [RAConsole.ZEEBO]: {
    name: "Zeebo - Zeebo",
    urls: ["https://myrient.erista.me/files/No-Intro/Zeebo%20-%20Zeebo/"]
  },
  [RAConsole.AMSTRADCPC]: {
    name: "Amstrad - CPC",
    urls: ["https://myrient.erista.me/files/No-Intro/Amstrad%20-%20CPC%20%28Misc%29/"]
  },
  [RAConsole.APPLEII]: {
    name: "Apple - II",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Apple%20-%20II%20%28WOZ%29/",
      "https://myrient.erista.me/files/No-Intro/Apple%20-%20II%20%28A2R%29/"
    ]
  },
};
