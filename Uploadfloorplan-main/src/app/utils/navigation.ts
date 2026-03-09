// Simple hash-based navigation helper
export const navigate = (path: string) => {
  window.location.hash = path;
};

export const useNavigate = () => {
  return navigate;
};
