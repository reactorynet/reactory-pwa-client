  const safeUrl = (route: string) => {
    const baseUrl = localStorage.getItem('REACT_APP_API_ENDPOINT') || '';
    return `${baseUrl.replace(/\/+$/, '')}/${route.replace(/^\/+/, '')}`;
  }

  export default safeUrl;