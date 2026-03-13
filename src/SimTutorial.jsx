import { useState } from 'react';
import './styles/SimTutorial.css';



function SimTutorial({closeTutorial=null}){
    const [currentPage, setCurrentPage] = useState(1);
    const lastPage = 3;

    const nextPage = () => {
        if(currentPage != lastPage){
            setCurrentPage(currentPage + 1)
        } else {
            closeTutorial();
        }
    }
    return(
        <>
        {(currentPage) == 1 ? 
        <div className="SimTutorialPage">
            <p> I am Page 1</p>
            <button onClick={nextPage}>Next Page</button>
        </div> : null}
        {(currentPage) == 2 ? 
        <div className="SimTutorialPage">
            <p> I am Page 2</p>
            <button onClick={nextPage}>Next Page</button>
        </div> : null}
        {(currentPage) == 3 ? 
        <div className="SimTutorialPage">
            <p> I am Page 3</p>
            <button onClick={nextPage}>Next Page</button>
        </div> : null}
        </>
    )
}

export default SimTutorial;