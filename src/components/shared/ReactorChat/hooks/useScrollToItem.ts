const scrollToItem = (itemRef: React.RefObject<HTMLDivElement>) => {
  if (itemRef.current) {
    itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
};
