(() => {
  const main = document.querySelector('body.docs .docs-main');
  if (!main || main.dataset.sectionsGrouped === 'true') return;

  const headings = [...main.children].filter((node) => node.matches('h2'));
  headings.forEach((heading, index) => {
    const group = document.createElement('section');
    group.className = 'docs-section-group';
    group.dataset.sectionTone = String(index % 2);
    main.insertBefore(group, heading);

    group.append(heading);
    let node = group.nextSibling;
    while (node && (node.nodeType !== Node.ELEMENT_NODE || !node.matches('h2, .docs-pager'))) {
      const next = node.nextSibling;
      group.append(node);
      node = next;
    }
  });

  main.dataset.sectionsGrouped = 'true';
})();
