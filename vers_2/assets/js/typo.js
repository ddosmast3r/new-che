/* Типограф: неразрывные пробелы, чтобы предлоги, единицы измерения и инициалы
   не отрывались от соседнего слова при переносе строки.
   Работает с текстом страницы как есть — тексты в HTML можно править обычными пробелами. */
(() => {
  const NB = ' ';
  const SHORT = '[А-Яа-яЁёA-Za-z]{1,2}|без|для|над|под|при|про|изо|ото|обо|все|это|как|что';
  const rules = [
    // короткие слова и предлоги прилипают к следующему слову
    [new RegExp(`(^|[\\s«„( ])(${SHORT})\\s+(?=\\S)`, 'gi'), `$1$2${NB}`],
    // частицы прилипают к предыдущему слову
    [/(\S)\s+(же|ли|бы|ль)(?=[\s.,;:!?»)]|$)/g, `$1${NB}$2`],
    // число и единица измерения
    [/(\d)\s+(г|гр|кг|мл|л|шт|руб|₽|%|мин|ч|км|м)(?=[\s.,;:!?»)/]|$)/g, `$1${NB}$2`],
    // число и следующее слово-счёт («3 шт», «2 гостя», «100 г») — короткие числа
    [/(^|\s)(\d{1,3})\s+(?=[А-Яа-яЁё])/g, `$1$2${NB}`],
    // сокращения: пр. Кирова, ул., д., г., ст.
    [/(^|[\s(])(пр|ул|д|г|ст|пер|им|т)\.\s+/g, `$1$2.${NB}`],
    // инициалы: Егоян Л. Д.
    [/([А-ЯЁ][а-яё]+)\s+([А-ЯЁ]\.)\s*([А-ЯЁ]\.)/g, `$1${NB}$2${NB}$3`],
    // тире не начинает строку
    [/\s+([—–])\s/g, `${NB}$1 `],
  ];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

  function typo(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !SKIP.has(n.parentElement.tagName) && /\S/.test(n.nodeValue)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      let t = n.nodeValue;
      // дважды: «и в доме» — оба коротких слова подряд
      for (let i = 0; i < 2; i++) rules.forEach(([re, to]) => { t = t.replace(re, to); });
      if (t !== n.nodeValue) n.nodeValue = t;
    });
  }

  window.typo = typo;
  // после остальных скриптов: к этому моменту телефон, адрес и меню уже подставлены
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => typo());
  else typo();
})();
