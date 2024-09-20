import { keyframes } from '@mui/system';

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

export const customStyles = {
  button: {
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    },
    '&:active': {
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      transition: 'all 0.3s ease-in-out',
      '&.Mui-focused': {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'primary.main',
          borderWidth: '2px',
          animation: `${pulse} 1s`,
        },
      },
    },
  },
};
