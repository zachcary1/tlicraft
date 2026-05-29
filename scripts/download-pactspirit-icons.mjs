import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, "../public/icons/pactspirits");
const CDN  = "https://cdn.tlidb.com/UI/Textures/Common/Icon/Pet/116_192/";

// [name, folder, filename]
const entries = [
  // ── Attack / Spell / Persistent / Summon / Survival / Fire / Cold / Lightning / Elixir / Erosion → battle
  ["Awooawoo - Violet",                          "battle", "UI_Pet_R_AWuAWu2_01_116.webp"],
  ["Awooawoo - Drizzle",                         "battle", "UI_Pet_R_AWuAWu2_02_116.webp"],
  ["Awooawoo - Amber",                           "battle", "UI_Pet_R_AWuAWu2_04_116.webp"],
  ["Awooawoo - White Mist",                      "battle", "UI_Pet_R_AWuAWu_03_116.webp"],
  ["Awooawoo - Blue Sky",                        "battle", "UI_Pet_R_AWuAWu_05_116.webp"],
  ["Traveling Lizard - Green Leaf",              "battle", "UI_Pet_SR_LvXingXiaoXi2_01_116.webp"],
  ["Traveling Lizard - Violet",                  "battle", "UI_Pet_SR_LvXingXiaoXi2_02_116.webp"],
  ["Traveling Lizard - Ocean",                   "battle", "UI_Pet_SR_LvXingXiaoXi2_03_116.webp"],
  ["Traveling Lizard - Flower",                  "battle", "UI_Pet_SR_LvXingXiaoXi2_04_116.webp"],
  ["Red Umbrella",                               "battle", "UI_Pet_SSR_ChiSan2_01_116.webp"],
  ["Idling Weasel - Shallow Sea",                "battle", "UI_Pet_R_XianYouXiaoYou2_02_116.webp"],
  ["Idling Weasel - Sprouts",                    "battle", "UI_Pet_R_XianYouXiaoYou2_03_116.webp"],
  ["Idling Weasel - Abyss",                      "battle", "UI_Pet_R_XianYouXiaoYou2_01_116.webp"],
  ["Idling Weasel - Sandstone",                  "battle", "UI_Pet_R_XianYouXiaoYou_06_116.webp"],
  ["Plaintive Ball of Thread - Violet",          "battle", "UI_Pet_SR_AiYuanXianQiu2_03_116.webp"],
  ["Plaintive Ball of Thread",                   "battle", "UI_Pet_SR_AiYuanXianQiu2_01_116.webp"],
  ["Fog Scorpion",                               "battle", "UI_Pet_SSR_WuXie2_01_116.webp"],
  ["Flower Whisperer",                           "battle", "UI_Pet_SSR_HuaYuZhe2_01_116.webp"],
  ["Luluri - Amethyst",                          "battle", "UI_Pet_R_LuLuLi2_01_116.webp"],
  ["Luluri - Maple",                             "battle", "UI_Pet_R_LuLuLi2_04_116.webp"],
  ["Luluri - Golden Leaf",                       "battle", "UI_Pet_R_LuLuLi2_03_116.webp"],
  ["Luluri - Shallow Sea",                       "battle", "UI_Pet_R_LuLuLi_05_116.webp"],
  ["Hell Cavalry - Glow",                        "battle", "UI_Pet_SR_YouYuQingQi2_04_116.webp"],
  ["Hell Cavalry",                               "battle", "UI_Pet_SR_YouYuQingQi2_01_116.webp"],
  ["Hell Cavalry - Crushed Ice",                 "battle", "UI_Pet_SR_YouYuQingQi_02_116.webp"],
  ["Hell Cavalry - Muffled Thunder",             "battle", "UI_Pet_SR_YouYuQingQi_03_116.webp"],
  ["Hell Cavalry - Twilight",                    "battle", "UI_Pet_SR_YouYuQingQi_06_116.webp"],
  ["The Bone Worm's Daughter",                   "battle", "UI_Pet_SSR_GuChongZhiNv2_01_116.webp"],
  ["Winter Darer - Shallow Sea",                 "battle", "UI_Pet_SR_LinDongMangHan2_02_116.webp"],
  ["Winter Darer",                               "battle", "UI_Pet_SR_LinDongMangHan2_01_116.webp"],
  ["Winter Darer - Lava",                        "battle", "UI_Pet_SR_LinDongMangHan_04_116.webp"],
  ["Winter Darer - Rock",                        "battle", "UI_Pet_SR_LinDongMangHan_03_116.webp"],
  ["Winter Darer - Sky",                         "battle", "UI_Pet_SR_LinDongMangHan_05_116.webp"],
  ["Starcatcher",                                "battle", "UI_Pet_SSR_BuXingZhe2_01_116.webp"],
  ["Cloudgatherer - Violet",                     "battle", "UI_Pet_SR_CaiYunZhe2_02_116.webp"],
  ["Cloudgatherer - Sparkle",                    "battle", "UI_Pet_SR_CaiYunZhe2_01_116.webp"],
  ["Dreamweaver",                                "battle", "UI_Pet_SSR_ZhiMengZhe2_01_116.webp"],
  ["Greedy Chestnut - Lotus Leaf",               "battle", "UI_Pet_SR_TanCaiXiaoLi2_03_116.webp"],
  ["Greedy Chestnut - Emerald",                  "battle", "UI_Pet_SR_TanCaiXiaoLi2_04_116.webp"],
  ["Greedy Chestnut - Lotus Root",               "battle", "UI_Pet_SR_TanCaiXiaoLi2_02_116.webp"],
  ["Greedy Chestnut - Radiance",                 "battle", "UI_Pet_SR_TanCaiXiaoLi2_01_116.webp"],
  ["Fire Swordsman",                             "battle", "UI_Pet_SSR_YanDaoKe2_01_116.webp"],
  ["Crossroad Walker",                           "battle", "UI_Pet_SSR_QiLuRen2_01_116.webp"],
  ["Firewing",                                   "battle", "UI_Pet_SSR_ChiYu2_01_116.webp"],
  ["Spiny Snail - Flower",                       "battle", "UI_Pet_R_CiTouXiaoWo2_03_116.webp"],
  ["Spiny Snail - Iris",                         "battle", "UI_Pet_R_CiTouXiaoWo2_02_116.webp"],
  ["Spiny Snail - Cloudless Sky",                "battle", "UI_Pet_R_CiTouXiaoWo2_01_116.webp"],
  ["Spiny Snail - Green",                        "battle", "UI_Pet_R_CiTouXiaoWo_05_116.webp"],
  ["Spiny Snail - Flame",                        "battle", "UI_Pet_R_CiTouXiaoWo_06_116.webp"],
  ["Mechanical Throne",                          "battle", "UI_Pet_SSR_JiGuanQuanBing2_01_116.webp"],
  ["Explorer Otter - Olive",                     "battle", "UI_Pet_R_TanXianXiaoTa2_02_116.webp"],
  ["Explorer Otter - Mudstone",                  "battle", "UI_Pet_R_TanXianXiaoTa2_01_116.webp"],
  ["Explorer Otter - Rock",                      "battle", "UI_Pet_R_TanXianXiaoTa2_04_116.webp"],
  ["Explorer Otter - Quicksand",                 "battle", "UI_Pet_R_TanXianXiaoTa2_03_116.webp"],
  ["Drapion Lady",                               "battle", "UI_Pet_SSR_LongXieHuoNv2_01_116.webp"],
  ["Whisperwind Leaves",                         "battle", "UI_Pet_SSR_FengYuYe2_01_116.webp"],
  ["Anthem",                                     "battle", "UI_Pet_SSR_ShengGe2_01_116.webp"],
  ["Spirit Bless",                               "battle", "UI_Pet_SSR_LingYou2_01_116.webp"],
  ["Preserver of Eternity",                      "battle", "UI_Pet_SSR_YongHengHuHuan2_02_116.webp"],
  ["Knight of Pale Blue",                        "battle", "UI_Pet_SSR_CangLanQiShi2_01_116.webp"],
  ["Happy Chonky - Ember",                       "battle", "UI_Pet_R_KuaiLeXiaoFei_04_116.webp"],
  ["Happy Chonky - Electrify",                   "battle", "UI_Pet_R_KuaiLeXiaoFei_02_116.webp"],
  ["Melting Flames",                             "battle", "UI_Pet_SSR_RongHuo_01_116.webp"],
  ["Ice Puppet",                                 "battle", "UI_Pet_SSR_KuiBing_01_116.webp"],
  ["Bitter Thunder",                             "battle", "UI_Pet_SSR_LingLei_01_116.webp"],
  ["Warbler of Plum Blossoms",                   "battle", "UI_Pet_SSR_XianMeiZhiYing_01_116.webp"],
  ["Poisoned Omen",                              "battle", "UI_Pet_SSR_GaoSiZhiZhen_01_116.webp"],
  ["Shocket - Violet",                           "battle", "UI_Pet_R_YiDongDianZi_02_116.webp"],
  ["Shocket - Pale",                             "battle", "UI_Pet_R_YiDongDianZi_04_116.webp"],
  ["Shocket - Green Leaf",                       "battle", "UI_Pet_R_YiDongDianZi_05_116.webp"],
  ["Letice - Flame",                             "battle", "UI_Pet_SR_ChunKunXiaoWo_03_116.webp"],
  ["Letice - Amethyst",                          "battle", "UI_Pet_SR_ChunKunXiaoWo_04_116.webp"],
  ["Letice - Withered Leaf",                     "battle", "UI_Pet_SR_ChunKunXiaoWo_05_116.webp"],
  ["Abyssal King Soul",                          "battle", "UI_Pet_SSR_ShenYuanWangHun_01_116.webp"],
  ["Scale of Original Sin",                      "battle", "UI_Pet_SSR_EYuShiTu_01_116.webp"],
  ["Raging Sands of Eternal Night",              "battle", "UI_Pet_SSR_YongYeKuangSha_01_116.webp"],
  ["Witch Antelope of Lust",                     "battle", "UI_Pet_SSR_MeiYuSiJi_01_116.webp"],
  ["First Mate of the Furious Sea - Rock",       "battle", "UI_Pet_SR_NuHaiDaFu_01_116.webp"],
  ["First Mate of the Furious Sea - Sky",        "battle", "UI_Pet_SR_NuHaiDaFu_02_116.webp"],
  ["Backup Power",                               "battle", "UI_Pet_SSR_DianNengChuBeiLiang_01_116.webp"],
  ["Captain Kitty of the Furious Sea",           "battle", "UI_Pet_SSR_NuHaiMiaoWang_116.webp"],
  ["Feasting Samurai - Honey",                   "battle", "UI_Pet_R_GanFanWuShi_05_116.webp"],
  ["Feasting Samurai - Orange",                  "battle", "UI_Pet_R_GanFanWuShi_02_116.webp"],
  ["Feasting Samurai - Garlic",                  "battle", "UI_Pet_R_GanFanWuShi_04_116.webp"],
  ["Dragon Plant - Truffle",                     "battle", "UI_Pet_SR_QingLongCaiCai_05_116.webp"],
  ["Dragon Plant - Kale",                        "battle", "UI_Pet_SR_QingLongCaiCai_04_116.webp"],
  ["Dragon Plant - Onion",                       "battle", "UI_Pet_SR_QingLongCaiCai_03_116.webp"],
  ["Iron Lion",                                  "battle", "UI_Pet_SSR_TieZhuXiongShi_01_116.webp"],
  ["Swaying Bonnie",                             "battle", "UI_Pet_SSR_BangNiYaoBai_01_116.webp"],
  ["Sprite of Silent Vale",                      "battle", "UI_Pet_SSR_YouGuHuaLing_116.webp"],
  ["Sprouting Grass - Green Porcelain",          "battle", "UI_Pet_R_ZhongCaoXiaoYa_04_116.webp"],
  ["Sprouting Grass - Black Porcelain",          "battle", "UI_Pet_R_ZhongCaoXiaoYa_03_116.webp"],
  ["Benign Bug - Ghost Light Yellow",            "battle", "UI_Pet_SR_LiangXingBaGe_05_116.webp"],
  ["Benign Bug - Tolerant Green",                "battle", "UI_Pet_SR_LiangXingBaGe_04_116.webp"],
  ["Portrait of a Fallen Saintess",              "battle", "UI_Pet_SSR_XieDuShengNvDeXiaoXiang_01_116.webp"],
  ["Shro-Shroom - Boletus",                      "battle", "UI_Pet_SR_XiaoGuGuGu_02_116.webp"],
  ["Shro-Shroom - Oyster Mushroom",              "battle", "UI_Pet_SR_XiaoGuGuGu_04_116.webp"],
  ["Shro-Shroom - Gloom Shroom",                 "battle", "UI_Pet_SR_XiaoGuGuGu_05_116.webp"],
  ["Valkyrie's Night Patrol",                    "battle", "UI_Pet_SSR_NvWuShenDeYeXun_01_116.webp"],
  ["Lumidrake - Fluorescence",                   "battle", "UI_Pet_R_XiaoDengLong_02_116.webp"],
  ["Lumidrake - Aurora",                         "battle", "UI_Pet_R_XiaoDengLong_04_116.webp"],
  ["Lumidrake - Candlelight",                    "battle", "UI_Pet_R_XiaoDengLong_05_116.webp"],
  ["Azure Gunslinger",                           "battle", "UI_Pet_SSR_LanXinHuoChong_01_116.webp"],
  ["Squiddle",                                   "battle", "UI_Pet_SSR_CaiMoDuoDuo_01_116.webp"],
  ["Kitty Express",                              "battle", "UI_Pet_SSR_KuMaoZhaiJiSong_01_116.webp"],
  ["Meowth",                                     "battle", "UI_Pet_R_MaoEZi_01_116.webp"],
  ["Miss Melancholy",                            "battle", "UI_Pet_SR_GuYingYouYou_01_116.webp"],
  ["Elixir Fairies",                             "battle", "UI_Pet_SSR_YaoXianZi_01_116.webp"],

  // ── Drop → drop
  ["Idling Weasel - Cherry Blossom",             "drop",   "UI_Pet_R_XianYouXiaoYou2_04_116.webp"],
  ["Idling Weasel - Sparkle",                    "drop",   "UI_Pet_R_XianYouXiaoYou_05_116.webp"],
  ["Cloudgatherer - Sky",                        "drop",   "UI_Pet_SR_CaiYunZhe2_03_116.webp"],
  ["Cloudgatherer - Surging Gold",               "drop",   "UI_Pet_SR_CaiYunZhe2_04_116.webp"],
  ["Cloudgatherer - Sky's Dome",                 "drop",   "UI_Pet_SR_CaiYunZhe_05_116.webp"],
  ["Captain Shadow",                             "drop",   "UI_Pet_SSR_YouLingJianZhang2_01_116.webp"],
  ["Luluri - Green Leaf",                        "drop",   "UI_Pet_R_LuLuLi2_02_116.webp"],
  ["Plaintive Ball of Thread - Flower",          "drop",   "UI_Pet_SR_AiYuanXianQiu2_04_116.webp"],
  ["Plaintive Ball of Thread - Gold Leaf",       "drop",   "UI_Pet_SR_AiYuanXianQiu_02_116.webp"],
  ["Plaintive Ball of Thread - Frost",           "drop",   "UI_Pet_SR_AiYuanXianQiu_05_116.webp"],
  ["Eternity Summoner",                          "drop",   "UI_Pet_SSR_YongHengHuHuan2_01_116.webp"],
  ["Happy Chonky",                               "drop",   "UI_Pet_R_KuaiLeXiaoFei2_01_116.webp"],
  ["Happy Chonky - Emerald",                     "drop",   "UI_Pet_R_KuaiLeXiaoFei_03_116.webp"],
  ["Happy Chonky - Sun",                         "drop",   "UI_Pet_R_KuaiLeXiaoFei_05_116.webp"],
  ["Happy Chonky - Violet",                      "drop",   "UI_Pet_R_KuaiLeXiaoFei_06_116.webp"],
  ["Chalk Spirit",                               "drop",   "UI_Pet_SSR_BaiEZhiLing2_01_116.webp"],
  ["Starfish Chanter",                           "drop",   "UI_Pet_SSR_HuanHaiXingKui_01_116.webp"],
  ["Kong",                                       "drop",   "UI_Pet_SSR_AKong_01_116.webp"],
  ["Corgi Fighter No.32",                        "drop",   "UI_Pet_SSR_ZhanDouJi_01_116.webp"],
  ["Spiny Snail - Cloud",                        "drop",   "UI_Pet_R_CiTouXiaoWo_04_116.webp"],
  ["Hell Cavalry - Sea",                         "drop",   "UI_Pet_SR_YouYuQingQi_05_116.webp"],
  ["Heart-binding Rose",                         "drop",   "UI_Pet_SSR_ZangAiMingQing_01_116.webp"],
  ["Shocket",                                    "drop",   "UI_Pet_R_YiDongDianZi_01_116.webp"],
  ["Shocket - Dark Night",                       "drop",   "UI_Pet_R_YiDongDianZi_03_116.webp"],
  ["Letice",                                     "drop",   "UI_Pet_SR_ChunKunXiaoWo_01_116.webp"],
  ["Letice - Frost",                             "drop",   "UI_Pet_SR_ChunKunXiaoWo_02_116.webp"],
  ["Monument Knight",                            "drop",   "UI_Pet_SSR_FengBeiQiShi_01_116.webp"],
  ["Fluffhead Hare",                             "drop",   "UI_Pet_SSR_HuLiHuTu_01_116.webp"],
  ["Shepherd",                                   "drop",   "UI_Pet_SSR_MuLingRen_01_116.webp"],
  ["First Mate of the Furious Sea - Silent Night","drop",  "UI_Pet_SR_NuHaiDaFu_03_116.webp"],
  ["Mistville Orphan",                           "drop",   "UI_Pet_SSR_ShuangMianYeCha_01_116.webp"],
  ["Feasting Samurai",                           "drop",   "UI_Pet_R_GanFanWuShi_01_116.webp"],
  ["Feasting Samurai - Mint",                    "drop",   "UI_Pet_R_GanFanWuShi_03_116.webp"],
  ["Dragon Plant",                               "drop",   "UI_Pet_SR_QingLongCaiCai_01_116.webp"],
  ["Dragon Plant - Lettuce",                     "drop",   "UI_Pet_SR_QingLongCaiCai_02_116.webp"],
  ["Alice 1",                                    "drop",   "UI_Pet_SSR_ZhiXieYiGu_01_116.webp"],
  ["Rainbowpaint Owl",                           "drop",   "UI_Pet_SSR_XueGuoYeXiao_116.webp"],
  ["Sprouting Grass",                            "drop",   "UI_Pet_R_ZhongCaoXiaoYa_116.webp"],
  ["Sprouting Grass - Purple Sand",              "drop",   "UI_Pet_R_ZhongCaoXiaoYa_02_116.webp"],
  ["Sprouting Grass - White Porcelain",          "drop",   "UI_Pet_R_ZhongCaoXiaoYa_05_116.webp"],
  ["Benign Bug - Barbie Pink",                   "drop",   "UI_Pet_SR_LiangXingBaGe_02_116.webp"],
  ["Benign Bug",                                 "drop",   "UI_Pet_SR_LiangXingBaGe_116.webp"],
  ["Benign Bug - Merciless Silver",              "drop",   "UI_Pet_SR_LiangXingBaGe_03_116.webp"],
  ["Jestress",                                   "drop",   "UI_Pet_SSR_HongTaoHuangNv_01_116.webp"],
  ["Doro-Doro Dorothy",                          "drop",   "UI_Pet_SSR_TLS007_116.webp"],
  ["Moonshadow Guide",                           "drop",   "UI_Pet_SSR_ShaHaiMiaoMiao_116.webp"],
  ["Lumidrake",                                  "drop",   "UI_Pet_R_XiaoDengLong_01_116.webp"],
  ["Lumidrake - Glow",                           "drop",   "UI_Pet_R_XiaoDengLong_03_116.webp"],
  ["Lumidrake - Flare",                          "drop",   "UI_Pet_R_XiaoDengLong_06_116.webp"],
  ["Shro-Shroom",                                "drop",   "UI_Pet_SR_XiaoGuGuGu_01_116.webp"],
  ["Shro-Shroom - Lurid Bolete",                 "drop",   "UI_Pet_SR_XiaoGuGuGu_03_116.webp"],
  ["Prof. SOURCE",                               "drop",   "UI_Pet_SSR_YuanBoShi_01_116.webp"],
  ["Key of Overrealm",                           "drop",   "UI_Pet_SSR_WeiTeLuWei_01_116.webp"],
  ["Bird Nest",                                  "drop",   "UI_Pet_SR_NiaoWoTouTou_01_116.webp"],
  ["Intern Shelley",                             "drop",   "UI_Pet_SSR_ShiXiYiShengXueLai_01_116.webp"],
  ["Meowth - Violet",                            "drop",   "UI_Pet_R_MaoEZi_02_116.webp"],
  ["Miss Melancholy - Cyan",                     "drop",   "UI_Pet_SR_GuYingYouYou_02_116.webp"],
  ["Avatar of Moon",                             "drop",   "UI_Pet_SSR_JiaoYueHuaShen_01_116.webp"],
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve("skip"); return; }
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) { file.close(); fs.unlinkSync(dest); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve("ok"); });
    }).on("error", (err) => { fs.existsSync(dest) && fs.unlinkSync(dest); reject(err); });
  });
}

let ok = 0, skipped = 0, failed = 0;
for (const [name, folder, filename] of entries) {
  const url  = CDN + filename;
  const dest = path.join(BASE, folder, name + ".webp");
  try {
    const result = await download(url, dest);
    if (result === "skip") { skipped++; process.stdout.write("s"); }
    else                   { ok++;      process.stdout.write("."); }
  } catch (e) {
    failed++;
    console.error(`\nFAIL [${name}]: ${e.message}`);
  }
}
console.log(`\nDone — ${ok} downloaded, ${skipped} skipped, ${failed} failed`);
