import IMAGE_PATH_ALIASES from './imagePathAliases.json';
import { IMAGE_ALTS } from './imageAlts';
// Photo credits for images that need (or carry) a visible credit.
// Source of truth for <PhotoCredits> and the /photo-credits/ page.
export interface PhotoCredit { paths: string[]; author: string; license: string; licenseUrl: string; source: string; alt: string; note: string }
export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    "paths": [
      "/assets/images/experiences/cultural/afghan-weddings/crops/city-star-wedding-hall-night-hero.webp",
      "/assets/images/experiences/cultural/afghan-weddings/crops/city-star-wedding-hall-night-card.webp",
      "/assets/images/experiences/cultural/afghan-weddings/city-star-wedding-hall-night.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Illuminated wedding hall at night with a City Star sign and a lit archway entrance",
    "note": "Supplied and approved by James 2026-10-14 (t245)"
  },
  {
    "paths": [
      "/assets/images/experiences/cultural/afghan-weddings/wedding-hall-interior.webp",
      "/assets/images/experiences/cultural/afghan-weddings/crops/wedding-hall-interior-hero.webp",
      "/assets/images/experiences/cultural/afghan-weddings/crops/wedding-hall-interior-card.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Interior of a large wedding hall with a gold domed ceiling and chandeliers above seated guests",
    "note": "Supplied and approved by James 2026-10-14 (t245)"
  },
  {
    "paths": [
      "/assets/images/experiences/cultural/afghan-weddings/wedding-guests-table.webp",
      "/assets/images/experiences/cultural/afghan-weddings/crops/wedding-guests-table-hero.webp",
      "/assets/images/experiences/cultural/afghan-weddings/crops/wedding-guests-table-card.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Guests at a wedding table set with rice, side dishes and canned drinks",
    "note": "Supplied and approved by James 2026-10-14 (t245)"
  },
  {
    "paths": [
      "/assets/images/food/produce/mulberries/mulberry-basket.webp",
      "/assets/images/food/produce/mulberries/crops/mulberry-basket-hero.webp",
      "/assets/images/food/produce/mulberries/crops/mulberry-basket-card.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Basket of fresh white, pink and black mulberries",
    "note": "Supplied and approved by James 2026-10-14 (t245)"
  },
  {
    "paths": [
      "/assets/images/food/produce/mulberries/black-mulberries-jsp013.webp",
      "/assets/images/food/produce/mulberries/crops/black-mulberries-jsp013-hero.webp",
      "/assets/images/food/produce/mulberries/crops/black-mulberries-jsp013-card.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Fresh black mulberries in a clear tub on a patterned carpet",
    "note": "Supplied and approved by James 2026-10-14 (t245)"
  },
  {
    "paths": [
      "/assets/images/food/produce/mulberries/gallery-1.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Fresh dark mulberries in a clear tub on an Afghan carpet, Kabul",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/experiences/activities/birding/peacock-kabul-jsp012.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Peacock displaying its fanned tail on a dirt yard in Kabul",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/attractions/qargha-lake/gallery-5.webp",
      "/assets/images/experiences/activities/birding/gallery/01.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Dalmatian pelican resting on a rock at Qargha Lake, Kabul",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/experiences/activities/sightseeing/shah-e-do-shamshira-kabul-jsp015.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Shah-e Do Shamshira Mosque in Kabul with pigeons and visitors in the square",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/experiences/activities/shopping/night-cherry-cart-kabul-jsp016.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Street vendor beside a cart piled with fresh cherries under a lamp at night, Kabul",
    "note": ""
  },
  {
    "paths": [],
    "author": "Casimiri at English Wikipedia",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
    "source": "https://commons.wikimedia.org/wiki/File:Kabul_Antiquity_Shop2.jpg",
    "alt": "Shelves of antiques and traditional crafts in a shop on Chicken Street, Kabul",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/attractions/chicken-street/hero.webp, /assets/images/attractions/chicken-street/thumb.webp."
  },
  {
    "paths": [],
    "author": "Danial",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "source": "https://commons.wikimedia.org/wiki/File:Dragon_Valley.jpg",
    "alt": "Folded ochre ridges of Dragon Valley (Darra-e Ajdahar) near Bamyan",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/attractions/dragon-valley-dara-e-ajdahar/thumb.webp. The current public hero.webp is James’s photo (t271/t273), not this Commons work. The Commons photo was later stored as gallery-valley-hills.webp and has been unpublished."
  },
  {
    "paths": [],
    "author": "WilliamEHenry",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "source": "https://commons.wikimedia.org/wiki/File:Shahr-e-Gholghola.jpg",
    "alt": "Ruined mud-brick citadel of Shahr-e-Gholghola on its hill near Bamyan",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/attractions/shahr-e-gholghola/hero.webp, /assets/images/attractions/shahr-e-gholghola/thumb.webp."
  },
  {
    "paths": [],
    "author": "Zeynel Cebeci",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Dried_mulberries,_Malatya_01.jpg",
    "alt": "Dried white mulberries",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/food/produce/central-valley-mulberries/hero.webp."
  },
  {
    "paths": [
      "/assets/images/attractions/wakhan-corridor/hero.webp",
      "/assets/images/attractions/wakhan-corridor/thumb.webp"
    ],
    "author": "Benoît Vicart",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "source": "https://commons.wikimedia.org/wiki/File:Sahrad.jpg",
    "alt": "Wide valley and mountains near Sarhad-e Broghil in the Wakhan Corridor",
    "note": ""
  },
  {
    "paths": [],
    "author": "Abdul Qahar Nuristan",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kashtun_da_waygale_Nuristan_-_panoramio.jpg",
    "alt": "Rocky mountainside with scattered trees in Nuristan",
    "note": "Illustrative photo: Kashtun village, Waygal valley, Nuristan Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/attractions/nuristan-national-park/gallery-mountainside-trees.webp, /assets/images/attractions/barg-e-matal-lakes/thumb.webp."
  },
  {
    "paths": [],
    "author": "SPC Vang Seng Thao",
    "license": "Public domain",
    "licenseUrl": "",
    "source": "https://commons.wikimedia.org/wiki/File:Afghan_residents_sell_sugarcane_in_the_market_district_of_Jalalabad,_Nangarhar_province,_Afghanistan,_June_1,_2013_130601-A-WI517-037.jpg",
    "alt": "Sugarcane for sale in a Jalalabad market",
    "note": "Withdrawn from public 22 Nov 2026 (t452u, owner-supplied replacements). File kept in unpublished-assets/sugarcane-replaced-20261122/. Former public path: /assets/images/food/produce/jalalabad-sugarcane/hero.webp."
  },
  {
    "paths": [
      "/assets/images/food/produce/jalalabad-sugarcane/hero.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Clear bags of cut sugarcane pieces and red crates of cane cubes on a market stall",
    "note": "James-supplied photograph (t452u). Landscape crop of the vendor-and-bags stall photo, used as the Sugarcane hero."
  },
  {
    "paths": [
      "/assets/images/food/produce/jalalabad-sugarcane/gallery-1-vendor-bags.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A vendor in a grey shirt and green gloves cutting sugarcane behind red crates and clear bags of cane cubes",
    "note": "James-supplied photograph (t452u)."
  },
  {
    "paths": [
      "/assets/images/food/produce/jalalabad-sugarcane/gallery-2-crates-stalks.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Red crates of cut sugarcane pieces and whole stalks on a stall, with a vendor in green gloves holding a cutter and a juice-press wheel behind",
    "note": "James-supplied photograph (t452u)."
  },
  {
    "paths": [
      "/assets/images/food/produce/jalalabad-sugarcane/gallery-3-juice-pour.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A man in an embroidered cap pouring sugarcane juice from a steel jug into a glass, with a press wheel and cane stalks behind him",
    "note": "James-supplied photograph (t452u). The file looks heavily retouched."
  },
  {
    "paths": [
      "/assets/images/food/produce/jalalabad-sugarcane/card.webp",
      "/assets/images/food/produce/jalalabad-sugarcane/gallery-4-cutting-cane.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "An older man in a white cap and striped apron cutting a sugarcane stalk beside a juice press",
    "note": "James-supplied photograph (t452u). Export metadata records Apple Photos Clean Up. Used as the Sugarcane card image."
  },
  {
    "paths": [
      "/assets/images/food/produce/kandahar-grapes/hero.webp"
    ],
    "author": "U.S. Department of Defense (DVIDS)",
    "license": "Public domain",
    "licenseUrl": "",
    "source": "https://commons.wikimedia.org/wiki/File:Canal_upgrades_begin_in_Kandahar_Province_DVIDS41555.jpg",
    "alt": "Grape vineyards in Kandahar Province",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/dishes/bamyan-potatoes/hero.webp",
      "/assets/images/food/dishes/bamyan-potatoes/thumb.webp"
    ],
    "author": "Sgt. Ken Scar (U.S. Armed Forces)",
    "license": "Public domain",
    "licenseUrl": "",
    "source": "https://commons.wikimedia.org/wiki/File:Afghan_farmers_in_Bamyan-2.jpg",
    "alt": "Farmers tending a potato field near Bamyan",
    "note": ""
  },
  {
    "paths": [],
    "author": "Abdul qayoum",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Pinus_gerardiana_forest,_Khost_Province,_Afghanistan.jpg",
    "alt": "Chilgoza pine forest in south-eastern Afghanistan",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/food/dried-fruits/paktia-pine-nuts/hero.webp."
  },
  {
    "paths": [
      "/assets/images/food/produce/balkh-melons/hero.webp",
      "/assets/images/food/produce/balkh-melons/thumb.webp"
    ],
    "author": "Julian-G. Albert",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Great_honey_melons_in_Aqcha.jpg",
    "alt": "Honey melons at a northern Afghan market",
    "note": ""
  },
  {
    "paths": [],
    "author": "PAULIX04",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Fresh_Watermelons_Stacked.jpg",
    "alt": "Stacked fresh watermelons at a market stall",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/food/produce/farah-watermelon/hero.webp, /assets/images/food/produce/farah-watermelon/thumb.webp."
  },
  {
    "paths": [
      "/assets/images/food/dried-fruits/herat-raisins/hero.webp",
      "/assets/images/food/dried-fruits/herat-raisins/thumb.webp"
    ],
    "author": "Bim24",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Raisins_1.jpg",
    "alt": "A mix of golden and dark raisins",
    "note": ""
  },
  {
    "paths": [],
    "author": "Ivar Leidus",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Walnuts_-_whole_and_open_with_halved_kernel.jpg",
    "alt": "Whole and cracked walnuts",
    "note": "Record kept: photo withdrawn from the walnuts card 2026-10-14 (rejected by James); file kept in qc/fix-2026-10-14/rejected and git history"
  },
  {
    "paths": [],
    "author": "Tigerlily143",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Istalif-shop-pottery.jpg",
    "alt": "Glazed turquoise pottery on display in an Istalif shop",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/experiences/cultural/istalif-pottery/gallery/02.webp."
  },
  {
    "paths": [],
    "author": "Afghanistan Matters from Brunssum, Netherlands",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Pottery_Merchant_(4311459614).jpg",
    "alt": "A pottery merchant in Istalif with his wares",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/experiences/cultural/istalif-pottery/gallery/03.webp."
  },
  {
    "paths": [],
    "author": "Annemarie Schwarzenbach",
    "license": "Public domain",
    "licenseUrl": "",
    "source": "https://commons.wikimedia.org/wiki/File:CH-NB_-_Afghanistan,_Jstalif_(Istalif)-_Geb%C3%A4ude_-_Annemarie_Schwarzenbach_-_SLA-Schwarzenbach-A-5-21-026.jpg",
    "alt": "Historical photograph of pottery stacked outside a house in Istalif",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/experiences/cultural/istalif-pottery/gallery/04.webp."
  },
  {
    "paths": [],
    "author": "Christopher Killalea",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Istalif_Village,_Kabul_Province,_Afghanistan.JPG",
    "alt": "Istalif village on its hillside above the Shamali Plain",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/experiences/cultural/istalif-pottery/gallery/05.webp."
  },
  {
    "paths": [],
    "author": "Jim Kelly",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:2009_shopping_Herat_Afghanistan_(4072194273).jpg",
    "alt": "A fruit seller with his cart in a Herat bazaar",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/experiences/activities/shopping/hero.webp, /assets/images/experiences/activities/shopping/thumb.webp."
  },
  {
    "paths": [],
    "author": "AhmadElhan",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Rowza_Shrine_Hazrat_Ali_Mazar-e_Sharif_Afghanistan......._front.jpg",
    "alt": "The blue-tiled Shrine of Hazrat Ali in Mazar-e Sharif",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/experiences/activities/sightseeing/hero.webp."
  },
  {
    "paths": [],
    "author": "Peretz Partensky from San Francisco, USA",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Jalalabad,_Afghanistan_(5397994701).jpg",
    "alt": "Sunset over the hills north of the Kabul River near Jalalabad",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/experiences/activities/hiking/hero.webp, /assets/images/experiences/activities/hiking/thumb.webp."
  },
  {
    "paths": [],
    "author": "Jim Kelly",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kabul_skyline_-a.jpg",
    "alt": "Kabul city skyline against the mountains",
    "note": " Withdrawn from public 22 Nov 2026 (t447u, high-risk replacement). File kept in unpublished-assets/high-risk-replaced-20261122/. Do not restore without a visible credit or a verified replacement. Former public paths: /assets/images/tours/custom/veteran-return/hero.webp, /assets/images/tours/custom/veteran-return/thumb.webp, /assets/images/tours/custom/veteran-return/thumbnail.webp."
  },
  {
    "paths": [
      "/assets/images/experiences/activities/cycling/hero.webp",
      "/assets/images/experiences/activities/cycling/thumb.webp"
    ],
    "author": "Sgt. Ken Scar, U.S. Army",
    "license": "Public domain",
    "licenseUrl": "",
    "source": "https://commons.wikimedia.org/wiki/File:Boys_with_bicycles_in_Bamyan-2012.jpg",
    "alt": "Two local boys cycling up a dirt road in the Bamyan valley, the empty Buddha niche in the cliffs behind",
    "note": "Editorial photo, 2012: local children, not tour guests"
  },
  {
    "paths": [
      "/assets/images/attractions/shah-e-du-shamshira/hero.webp",
      "/assets/images/attractions/shah-e-du-shamshira/thumb.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Shah-e Do Shamshira Mosque in Kabul, pigeons on the square in front",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/attractions/qargha-lake/gallery-4.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Qargha Lake seen from the terrace of the Spogmai Restaurant, Kabul",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/sheer-khurma/hero-owner-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Sheer khurma topped with a date in a glass bowl",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/sheer-yakh/sheer-e-yakh-owner-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Two tall swirls of sheer-e-yakh, Afghan ice cream, topped with crushed pistachios",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/saffron-ice-cream/hero-owner-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Two scoops of saffron ice cream topped with chopped pistachios and rose petals",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/kulcha-cookie/hero-owner-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Kulcha cookies with a criss-cross pattern and crushed pistachios on a decorated plate",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/kulcha-cookie/gallery-owner-2-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Golden ring-shaped kulcha cookies sprinkled with nigella seeds",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/kulcha-cookie/gallery-owner-1-collage-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Two photos of kulcha cookies: crosshatched cookies on paper, and patterned cookies topped with pistachios",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/gosh-e-fil/hero-owner-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A plate of gosh-e-fil, crisp fried pastries dusted with powdered sugar",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/kulcha-cookie/gallery-owner-4-box-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A box of assorted kulcha cookies and pastries from a Kabul bakery",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/food/sweets/kulcha-cookie/gallery-owner-5-bakery-shelf-20261121.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Round kulcha cookies stacked high on metal bakery shelves in Kabul",
    "note": ""
  },
  {
    "paths": [
      "/assets/images/attractions/dragon-valley-dara-e-ajdahar/hero.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "White mineral mounds and rock formations in Dragon Valley with mountains beyond",
    "note": "James-supplied photo used as Dragon Valley hero (t271; content confirmed t273). Credit record corrected 22 Nov 2026 (t447u) — this path is not the Danial Commons photograph."
  },
  {
    "paths": [
      "/assets/images/attractions/shahr-e-gholghola/card.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "The ruined tower of Shahr-e-Gholghola standing above the Bamyan valley",
    "note": "James-supplied (t271). Promoted to hero and card 22 Nov 2026 (t447u) replacing the WilliamEHenry CC BY-SA 4.0 photograph."
  },
  {
    "paths": [
      "/assets/images/tours/custom/veteran-return/hero.webp",
      "/assets/images/tours/custom/veteran-return/thumb.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "James Sidiqi, jsp-003, Kabul sunset panorama from the InterContinental Hotel grounds (owner-confirmed 13 Oct 2026)",
    "alt": "Sunset over the city of Kabul, seen from the grounds of the InterContinental Hotel",
    "note": "Replaced the Jim Kelly CC BY 2.0 Kabul skyline on veteran-return cards 22 Nov 2026 (t447u)."
  },
  {
    "paths": [
      "/assets/images/attractions/chicken-street/card.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Shoppers walking along Chicken Street in Kabul in winter",
    "note": "James-supplied (t271). Already the live hero and card; the Casimiri Commons shop photo was removed from the gallery 22 Nov 2026 (t447u)."
  },
  {
    "paths": [
      "/assets/images/food/dishes/bolani/owner-bolani-plated-20261122.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A stack of pan-fried bolani on a blue-and-gold scalloped plate, one piece showing a green herb filling, with green chillies and naan behind",
    "note": "James-supplied photograph (t453u). Used as the Bolani hero and Food & Culture card."
  },
  {
    "paths": [
      "/assets/images/attractions/shrine-of-hazrat-ali-blue-mosque/owner-20261122-white-pigeon-flight.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A white pigeon in flight on the Blue Mosque plaza in Mazar-i-Sharif",
    "note": "James-supplied photograph (t454u)."
  },
  {
    "paths": [
      "/assets/images/hubs/mazar-e-sharif/balkh-white-pigeons.webp",
      "/assets/images/hubs/mazar-e-sharif/gallery-3.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A man crouching to feed white pigeons at the Blue Mosque in Mazar-i-Sharif",
    "note": "James-supplied photograph (t454u). Already on the Mazar-e-Sharif hub as balkh-white-pigeons.webp and a smaller copy as gallery-3.webp; now also shown in the Blue Mosque attraction gallery."
  },
  {
    "paths": [
      "/assets/images/attractions/salang-pass/owner-20261122-roadside-shop-salang-mazar.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A roadside shop under a cliff on the road between the Salang and Mazar-i-Sharif, selling naan, snacks and drinks",
    "note": "James-supplied photograph (t454u)."
  },
  {
    "paths": [
      "/assets/images/hubs/mazar-e-sharif/owner-20261122-sheep-herd-outside-mazar.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "A passing herd of sheep outside Mazar-i-Sharif, with mountains behind",
    "note": "James-supplied photograph (t454u)."
  },
  {
    "paths": [
      "/assets/images/hubs/mazar-e-sharif/owner-20261122-trucks-tangi-tashkurgan.webp"
    ],
    "author": "AfghanTours",
    "license": "© AfghanTours",
    "licenseUrl": "",
    "source": "",
    "alt": "Large vehicles heading south toward the Salang at the entrance of Tangi Tashkurgan gorge",
    "note": "James-supplied photograph (t454u). A screenshot of the original; used as a gallery image only."
  }
];
const byPath = new Map<string, PhotoCredit>();
PHOTO_CREDITS.forEach((c) => c.paths.forEach((p) => byPath.set(p, c)));
// Shared file aliases preserve existing attribution records.
for (const [original, canonical] of Object.entries(IMAGE_PATH_ALIASES)) {
  if (!byPath.has(canonical) && byPath.has(original)) byPath.set(canonical, byPath.get(original)!);
}
// This hero was a wrong-subject mosque photo; use the furnace photo's metadata.
const GLASS_PHOTO = '/assets/images/experiences/cultural/glassblowers-of-herat/gallery/02.webp';
const GLASS_HERO = '/assets/images/experiences/cultural/glassblowers-of-herat/hero.webp';
if (byPath.has(GLASS_PHOTO)) byPath.set(GLASS_HERO, byPath.get(GLASS_PHOTO)!);
else byPath.delete(GLASS_HERO);
const norm = (src?: string | null) => (src || '').split('?')[0].replace(/^https?:\/\/[^/]+/, '');
export const creditFor = (src?: string | null) => byPath.get(norm(src));
export const altFor = (src: string | null | undefined, fallback: string) => norm(src) === GLASS_HERO
  ? creditFor(GLASS_PHOTO)?.alt || IMAGE_ALTS[GLASS_PHOTO] || 'Glassblower working beside a furnace in Herat'
  : creditFor(src)?.alt || IMAGE_ALTS[norm(src)] || fallback;
export const creditsFor = (srcs: (string | null | undefined)[]) => {
  const out: PhotoCredit[] = [];
  srcs.forEach((s) => { const c = creditFor(s); if (c && !out.includes(c)) out.push(c); });
  return out;
};
