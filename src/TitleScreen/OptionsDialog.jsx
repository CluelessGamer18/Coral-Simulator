import "./TitleScreen.css";

function OptionsDialog({setShowOptions, setShowTitleScreen = null, endSim = null}){

    const returnToTitle = () => {
        setShowOptions(false);
        if(setShowTitleScreen){
            setShowTitleScreen(true);
            endSim();
        }
    }
    return(
        <>
        <div className="OptionsBoxContainer">
            <button className="OptionsXButton" onClick={()=>setShowOptions(false)}>X</button>
            <h1 className="OptionsTitle">Options</h1>
            <button className="OptionsDialogButton" style={{ marginTop: "50px" }}onClick={()=>setShowOptions(false)}>Resume</button>
            <button className="OptionsDialogButton">Settings</button>
            <button className="OptionsDialogButton" onClick={returnToTitle}>Return to Title</button>
            <button className="OptionsDialogButton">Resources</button>
        </div>

        </>
    )
}

export default OptionsDialog;