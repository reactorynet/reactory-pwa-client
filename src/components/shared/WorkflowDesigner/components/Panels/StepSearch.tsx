import { useReactory } from "@reactory/client-core/api";

interface StepSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClear: () => void;
}

export default function StepSearch({ searchTerm, onSearchChange, onClear }: StepSearchProps) {
  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useCallback: useCallbackReact, useRef: useRefReact } = React;

  const inputRef = useRefReact<HTMLInputElement>(null);

  const handleInputChange = useCallbackReact((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  }, [onSearchChange]);

  const handleClear = useCallbackReact(() => {
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const handleKeyDown = useCallbackReact((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && searchTerm) {
      handleClear();
    }
  }, [searchTerm, handleClear]);

  const {
    TextField,
    InputAdornment,
    IconButton
  } = Material.MaterialCore;

  const {
    Search,
    Clear
  } = Material.MaterialIcons;

  return (
    <TextField
      ref={inputRef}
      fullWidth
      size="small"
      placeholder="Search steps..."
      value={searchTerm}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
        endAdornment: searchTerm && (
          <InputAdornment position="end">
            <IconButton
              aria-label="clear search"
              onClick={handleClear}
              edge="end"
              size="small"
            >
              <Clear />
            </IconButton>
          </InputAdornment>
        )
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'background.default'
        }
      }}
    />
  );
}
