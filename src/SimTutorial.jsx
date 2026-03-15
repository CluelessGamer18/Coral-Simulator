import { useState } from 'react';
import "./styles/SimTutorial.css";



function SimTutorial({ closeTutorial = null }) {
  const [currentPage, setCurrentPage] = useState(1);

  const lastPage = 5;

  const nextPage = () => {
    if (currentPage !== lastPage) {
      setCurrentPage(currentPage + 1);
    } else {
      closeTutorial();
    }
  };

  const prevPage = () => {
    setCurrentPage(currentPage - 1);
  };

  return (
    <div className="SimTutorialPage">
      <img src={`./tutorial/tutorialpage${currentPage}.png`} />

      <button className="SimTutorialAdvanceButton" onClick={nextPage}>
        {currentPage === lastPage ? "Let's Go!" : "Next"}
      </button>

      {currentPage > 1 && (
        <button className="SimTutorialPreviousButton" onClick={prevPage}>
          Go Back
        </button>
      )}
    </div>
  );
}

export default SimTutorial;
