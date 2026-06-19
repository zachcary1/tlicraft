$BASE = "https://cdn.tlidb.com/UI/Textures/Common/Icon/Skill/Contract/64"
$S  = "UI_Contract_Small"
$M  = "UI_Contract_Middle"
$L  = "UI_Contract_Large"
$E  = "_Icon_64.webp"
$OUT = "C:\Users\zachc\Documents\Projects\tlicraft\public\icons\pactspirits\nodes"

function U($type, $n) { "$BASE/${type}${n}$E" }

$map = [ordered]@{
  # ── Special ────────────────────────────────────────────────────────
  "Undetermined Fate Slots" = U $S 62
  "Destiny Slot"            = U $M 62

  # ── I / II pairs (Small N / Middle N) ─────────────────────────────
  "Ailment Chance I"            = U $S 23; "Ailment Chance II"            = U $M 23
  "Ailment Damage I"            = U $S 24; "Ailment Damage II"            = U $M 24
  "Ailment Duration I"          = U $S 25; "Ailment Duration II"          = U $M 25
  "Attack and Cast Speed I"     = U $S 47; "Attack and Cast Speed II"     = U $M 47
  "Attack Block I"              = U $S 53; "Attack Block II"              = U $M 53
  "Attack Critical Strike I"    = U $S 7;  "Attack Critical Strike II"    = U $M 7
  "Attack Damage I"             = U $S 6;  "Attack Damage II"             = U $M 6
  "Attack Speed I"              = U $S 8;  "Attack Speed II"              = U $M 8
  "Cast Speed I"                = U $S 17; "Cast Speed II"                = U $M 17
  "Channeled Damage I"          = U $S 61; "Channeled Damage II"          = U $M 61
  "Cold Damage I"               = U $S 40; "Cold Damage II"               = U $M 40
  "Cold Penetration I"          = U $S 43; "Cold Penetration II"          = U $M 43
  "Critical Strike Damage I"    = U $S 15; "Critical Strike Damage II"    = U $M 15
  "Crowd Control Effects II"    = U $M 56
  "Curse Effect I"              = U $S 50; "Curse Effect II"              = U $M 50
  "Cursed Enemy Weakening I"    = U $S 49; "Cursed Enemy Weakening II"    = U $M 49
  "Damage I"                    = U $S 1;  "Damage II"                    = U $M 1
  "Damage Affliction I"         = U $S 27; "Damage Affliction II"         = U $M 27
  "Damage Avoidance I"          = U $S 36; "Damage Avoidance II"          = U $M 36
  "Damage Mitigation I"         = U $S 37; "Damage Mitigation II"         = U $M 37
  "Damage Over Time I"          = U $S 20; "Damage Over Time II"          = U $M 20
  "Double Damage I"             = U $S 9;  "Double Damage II"             = U $M 9
  "Double Spell I"              = U $S 16; "Double Spell II"              = U $M 16
  "Drop Quantity I"             = U $S 5;  "Drop Quantity II"             = U $M 5
  "Elemental Damage I"          = U $S 18; "Elemental Damage II"          = U $M 18
  "Elemental Penetration I"     = U $S 19; "Elemental Penetration II"     = U $M 19
  "Elemental Resistance I"      = U $S 35; "Elemental Resistance II"      = U $M 35
  "Erosion Damage I"            = U $S 64; "Erosion Damage II"            = U $M 64
  "Erosion Penetration I"       = U $S 65; "Erosion Penetration II"       = U $M 65
  "Erosion Resistance I"        = U $S 55; "Erosion Resistance II"        = U $M 55
  "Fire Area I"                 = U $S 45; "Fire Area II"                 = U $M 45
  "Fire Damage I"               = U $S 39; "Fire Damage II"               = U $M 39
  "Fire Penetration I"          = U $S 42; "Fire Penetration II"          = U $M 42
  "Knockback Distance I"        = U $S 60; "Knockback Distance II"        = U $M 60
  "Lightning Damage I"          = U $S 41; "Lightning Damage II"          = U $M 41
  "Lightning Penetration I"     = U $S 44; "Lightning Penetration II"     = U $M 44
  "Mana Restoration I"          = U $S 13; "Mana Restoration II"          = U $M 13
  "Max Energy Shield I"         = U $S 34; "Max Energy Shield II"         = U $M 34
  "Max Frostbite Rating I"      = U $S 46; "Max Frostbite Rating II"      = U $M 46
  "Max Life I"                  = U $S 32; "Max Life II"                  = U $M 32
  "Movement Speed I"            = U $S 4;  "Movement Speed II"            = U $M 4
  "Multistrike I"               = U $S 10; "Multistrike II"               = U $M 10
  "Projectile Damage I"         = U $S 11; "Projectile Damage II"         = U $M 11
  "Projectile Speed I"          = U $S 12; "Projectile Speed II"          = U $M 12
  "Reaping Cooldown I"          = U $S 51; "Reaping Cooldown II"          = U $M 51
  "Servant Buff I"              = U $S 28; "Servant Buff II"              = U $M 28
  "Servant Cooldown I"          = U $S 31; "Servant Cooldown II"          = U $M 31
  "Servant Damage I"            = U $S 28; "Servant Damage II"            = U $M 28
  "Servant Life I"              = U $S 30; "Servant Life II"              = U $M 30
  "Servant Speed I"             = U $S 29; "Servant Speed II"             = U $M 29
  "Skill Duration I"            = U $S 26; "Skill Duration II"            = U $M 26
  "Spell Block I"               = U $S 54; "Spell Block II"               = U $M 54
  "Spell Critical Strike I"     = U $S 66; "Spell Critical Strike II"     = U $M 66
  "Spell Damage I"              = U $S 14; "Spell Damage II"              = U $M 14
  "Spirit Magus Seal Removed I" = U $S 52; "Spirit Magus Seal Removed II" = U $M 52
  "Warcry Cooldown I"           = U $S 58; "Warcry Cooldown II"           = U $M 58
  "Warcry Duration I"           = U $S 59; "Warcry Duration II"           = U $M 59
  "Warcry Effect I"             = U $S 57; "Warcry Effect II"             = U $M 57
  "XP Balance I"                = U $S 3;  "XP Balance II"                = U $M 3
  "XP Bonus I"                  = U $S 38; "XP Bonus II"                  = U $M 38
  "XP Protection I"             = U $S 38; "XP Protection II"             = U $M 38

  # ── Outer ring unique names (Large N) ─────────────────────────────
  '"Beast" Roar'                   = U $L 33
  "A Cat Gets What a Cat Wants!"   = U $L 43
  "Assassin Cat Snack"             = U $L 49
  "Bare Hand Painting"             = U $L 37
  "Bewitched"                      = U $L 31
  "Coming Hurricane"               = U $L 30
  "Bloodthirsty Reaping"           = U $L 10
  "Born in the Breeze"             = U $L 39
  "Burning Heart"                  = U $L 20
  "Candlelight Monument"           = U $L 28
  "Darkness Collector"             = U $L 3
  "Deep Sea Fluorescence"          = U $L 3
  "Eagle Eye"                      = U $L 6
  "Elemental Mastery"              = U $L 9
  "Ember Collector"                = U $L 3
  "Enhanced Attack"                = U $L 1
  "Enhanced Gathering"             = U $L 3
  "Enhanced Survival"              = U $L 2
  "Excruciating Thunder"           = U $L 22
  "Expanded Rapacity"              = U $L 3
  "Fallback"                       = U $L 5
  "Fatal Illusion"                 = U $L 7
  "Fate Trump Card"                = U $L 40
  "Flame Collector"                = U $L 3
  "Frenzy"                         = U $L 4
  "Gourd Spins, Luck Arrives"      = U $L 3
  "Graceful Pace"                  = U $L 18
  "Greenhorn"                      = U $L 15
  "Hamster on a Wheel"             = U $L 32
  "High Energy Shield"             = U $L 17
  "Ice Cage"                       = U $L 21
  "It's a pleasure to meet you."   = U $L 41
  "Malleable"                      = U $L 8
  "Mirror of Dream"                = U $L 29
  "Mist-Like Whisper"              = U $L 34
  "Open Wide!"                     = U $L 52
  "Overlapping Keys"               = U $L 48
  "Playtime"                       = U $L 36
  "Plum Blossom Picking"           = U $L 24
  "Poison Drinking"                = U $L 25
  "Privileged Consultation!"       = U $L 50
  "Pure Spirit Magus"              = U $L 14
  "Sacrilege"                      = U $L 42
  "Revelations of War"             = U $L 44
  "Scale of Judgment"              = U $L 27
  "Seven Steps"                    = U $L 45
  "Sound Body"                     = U $L 16
  "Soundwave Blast!"               = U $L 38
  "Squiddle"                       = U $L 47
  "Star-Plucking Dog"              = U $L 3
  "Sword Rain"                     = U $L 35
  "Synthetic Troop Edge"           = U $L 13
  "Unharmed Hunter"                = U $L 12
  "Unholy Throne"                  = U $L 26
  "Void Sea Reflections"           = U $L 23
  "Whispering Curse"               = U $L 11
}

$headers = @{ "Referer" = "https://tlidb.com/" }
$ok = 0; $skip = 0; $fail = 0
foreach ($entry in $map.GetEnumerator()) {
  $name = $entry.Key
  $url  = $entry.Value
  $safe = $name -replace '[\\/:*?"<>|]', '_'
  $dest = "$OUT\$safe.webp"
  if (Test-Path $dest) { $skip++; continue }
  try {
    Invoke-WebRequest -Uri $url -OutFile $dest -Headers $headers -UseBasicParsing -ErrorAction Stop
    $ok++
  } catch {
    Write-Warning "FAIL: $name -> $url"
    $fail++
  }
}
Write-Host "Done. Downloaded: $ok  Skipped: $skip  Failed: $fail"
