import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '32px',
    backgroundColor: '#f9f9f9',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    margin: '24px 0',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    backgroundColor: '#6b2fa5',
    borderRadius: '50%',
    padding: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: 'white',
    width: '36px',
    height: '36px',
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#222',
  },
  description: {
    margin: 0,
    fontSize: '1rem',
    color: '#555',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#6b2fa5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonHover: {
    backgroundColor: '#5a2492'
  },
  buttonIcon: {
    width: '20px',
    height: '20px',
  },
};

export const ReviewCTA = ({ onReviewClick }) => {
  const navigate = useNavigate();

  const handleReviewClick = () => {
    if (onReviewClick) {
      onReviewClick();
    } else {
      navigate('/event-review');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content as React.CSSProperties}>
        <div style={styles.iconContainer}>
          <div style={styles.iconWrapper}>
            <Star style={styles.icon} />
          </div>
        </div>
        <div style={styles.textContainer as React.CSSProperties}>
          <h3 style={styles.title}>Share Your Experience</h3>
          <p style={styles.description}>
            Drop a review for any of the events you bought ticket for here.
          </p>
          <button
            onClick={handleReviewClick}
            style={styles.button}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = styles.buttonHover.backgroundColor;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = styles.button.backgroundColor;
            }}
          >
            <Star style={styles.buttonIcon} />
            Leave a Review
          </button>
        </div>
      </div>
    </div>
  );
};
