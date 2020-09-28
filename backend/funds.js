'use strict';

// Import internal dependencies
const bluzelleLib = require('./lib/bluzelle');

module.exports.transfer = async (event)=> {
  // ACCOUNTS
  // [Master account] pigeon govern length purse matter add tool animal humble obtain purpose city happy grit miss speed merit heart message mean jealous great analyst boil
  // [Dev frontend] humor symbol donate time vibrant candy worth amateur acid brother traffic retire apple label maid someone solution plug escape nest reunion permit pulp helmet
  // [Dev backend] please wrestle style panther moral conduct expand corn system surface shine weapon avocado rich awesome wink pet apart mosquito state cash erase correct orchard
  // [Prod frontend] civil urge van time vendor battle odor foot rib client phrase general relief abuse hundred age busy love cricket piece banner tomato six cushion
  // [Prod backend] pig result slow truly secret raw more visit cancel thunder depend addict cannon icon three sand muscle blanket bench excite input fresh sure cancel

  const bzConfig = {
    mnemonic: 'pigeon govern length purse matter add tool animal humble obtain purpose city happy grit miss speed merit heart message mean jealous great analyst boil',
    chain_id: "bluzelleTestNetPublic-6",
    endpoint: "https://client.sentry.testnet.public.bluzelle.com:1319/"
  }

  const bz = await bluzelleLib.init(bzConfig);
  const bz2 = await bluzelleLib.init({
    ...bzConfig,
    mnemonic: 'please wrestle style panther moral conduct expand corn system surface shine weapon avocado rich awesome wink pet apart mosquito state cash erase correct orchard'
  });

  let bnt = await bz.getBNT();
  console.log('bnt master', bnt);
  await bz.transferTokensTo(bz2.address, 5000, {gas_price: 10});
  bnt = await bz2.getBNT();
  console.log('bnt child', bnt);

  return;
}


module.exports.check = async (event)=> {
  // ACCOUNTS
  // [Master account] pigeon govern length purse matter add tool animal humble obtain purpose city happy grit miss speed merit heart message mean jealous great analyst boil
  // [Dev frontend] humor symbol donate time vibrant candy worth amateur acid brother traffic retire apple label maid someone solution plug escape nest reunion permit pulp helmet
  // [Dev backend] please wrestle style panther moral conduct expand corn system surface shine weapon avocado rich awesome wink pet apart mosquito state cash erase correct orchard
  // [Prod frontend] civil urge van time vendor battle odor foot rib client phrase general relief abuse hundred age busy love cricket piece banner tomato six cushion
  // [Prod backend] pig result slow truly secret raw more visit cancel thunder depend addict cannon icon three sand muscle blanket bench excite input fresh sure cancel

  const bzConfig = {
    mnemonic: 'pigeon govern length purse matter add tool animal humble obtain purpose city happy grit miss speed merit heart message mean jealous great analyst boil',
    chain_id: "bluzelleTestNetPublic-6",
    endpoint: "https://client.sentry.testnet.public.bluzelle.com:1319/"
  }

  let bz = await bluzelleLib.init(bzConfig);
  let bnt = await bz.getBNT();
  console.log('[Master account]', bnt);

  bz = await bluzelleLib.init({
    ...bzConfig,
    mnemonic: 'please wrestle style panther moral conduct expand corn system surface shine weapon avocado rich awesome wink pet apart mosquito state cash erase correct orchard'
  });
  bnt = await bz.getBNT();
  console.log('[Dev backend]', bnt);

  bz = await bluzelleLib.init({
    ...bzConfig,
    mnemonic: 'pig result slow truly secret raw more visit cancel thunder depend addict cannon icon three sand muscle blanket bench excite input fresh sure cancel'
  });
  bnt = await bz.getBNT();
  console.log('[Prod backend]', bnt);

  return;
}
