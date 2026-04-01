import { useState } from 'react';
import "./styles/SimTutorial.css";



function SimTutorial({ closeTutorial = null }) {
  const [currentPage, setCurrentPage] = useState(1);

  const lastPage = 4;

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

  const simulateSwitch = (param) => {
    switch(param) {
      case 1:
        return (<div className="SimTutorialContent">
          <h2 className="SimTutorialTitle">Controls</h2>
          <p className="SimTutorialText">You are a fish living on a coral reef.  Move your cursor to explore your environment.</p>
          <img src={`./tutorial/tutorial_1.png`} />

        </div>
        );
      case 2:
        return (
          <div className="SimTutorialContent">
            <h2 className="SimTutorialTitle">Changing the Environement</h2>
            <p className="SimTutorialText">Change the light, temperature, and pollution by popping bubbles, and determine if your coral on the reef will survive.</p>
            <img src={`./tutorial/tutorial_2.png`} />
          </div>
        );
      case 3:
        return (
          <div className="SimTutorialContent">
            <h2 className="SimTutorialTitle">Advancing Time</h2>
            <p className="SimTutorialText">Popping bubbles advances your reef one year, revealing its impact on the coral.</p>
            <img src={`./tutorial/tutorial_3.png`} />
          </div>
        );
      default:
        return (
          <div className="SimTutorialContent">
            <h2 className="SimTutorialTitle">Let's Get Started!</h2>
            <p className="SimTutorialText">Explore the environment and have fun!</p>
            <img src={`./tutorial/tutorial_4.png`} />
          </div>
        );
    }
  }

  return (
    <div className="SimTutorialPage">
      {/* <img src={`./tutorial/tutorialpage${currentPage}.png`} /> */}
      <div className="tutorialContainer">
        <div>
        {simulateSwitch(currentPage)}
        </div>

        <button className="SimTutorialAdvanceButton" onClick={nextPage}>
          {currentPage === lastPage ? "Let's Go!" : "Next"}
        </button>

        {currentPage > 1 && (
          <button className="SimTutorialPreviousButton" onClick={prevPage}>
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}

export default SimTutorial;
