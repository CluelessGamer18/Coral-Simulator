import { useState } from 'react';
import "./styles/SimTutorial.css";
import { asset } from './assetUrl';



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

  const simulateSwitch = (param) => {
    switch(param) {
      case 1:
        return (<div className="SimTutorialContent">
          <h2 className="SimTutorialTitle">Controls</h2>
          <p className="SimTutorialText">You are a fish living on a coral reef. Use the W, A, S and D keys to swim around and explore your environment.</p>
          <img src={asset("tutorial/tutorial_wasd.png")} alt="The W, A, S and D keys beside a fish swimming toward the coral reef" />

        </div>
        );
      case 2:
        return (
          <div className="SimTutorialContent">
            <h2 className="SimTutorialTitle">Changing the Environement</h2>
            <p className="SimTutorialText">Change the light, temperature, and pollution by popping bubbles, and determine if your coral on the reef will survive.</p>
            <img src={asset("tutorial/tutorial_2.png")} alt="A fish swimming toward a pollution bubble" />
          </div>
        );
      case 3:
        return (
          <div className="SimTutorialContent">
            <h2 className="SimTutorialTitle">Advancing Time</h2>
            <p className="SimTutorialText">Popping bubbles advances your reef one year, revealing its impact on the coral.</p>
            <img src={asset("tutorial/tutorial_3.png")} alt="Corals on the reef" />
          </div>
        );
      case 4:
        return (
          <div className="SimTutorialContent">
            <h2 className="SimTutorialTitle">Watch Out for Predators</h2>
            <p className="SimTutorialText">A predator will come hunting for you. Swim close to the coral and press Z to hide until it swims away.</p>
            <img src={asset("tutorial/tutorial_predator.png")} alt="The Z key beside a fish hiding in the coral while a barracuda swims past" />
          </div>
        );
      default:
        return (
          <div className="SimTutorialContent">
            <h2 className="SimTutorialTitle">Let's Get Started!</h2>
            <p className="SimTutorialText">Explore the environment and have fun!</p>
            <img src={asset("tutorial/tutorial_4.png")} alt="A fish ready to explore the reef" />
          </div>
        );
    }
  }

  return (
    <div className="SimTutorialPage">
      {/* <img src={asset(`tutorial/tutorialpage${currentPage}.png`)} /> */}
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
