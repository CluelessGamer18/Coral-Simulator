import "./TitleScreen.css";

function OptionsDialog({setShowOptions}){
    return(
        <>
        <div className="OptionsBoxContainer">
            <h1 className="OptionsTitle">Options</h1>
            <button className="OptionsDialogButton" style={{ marginTop: "50px" }}onClick={()=>setShowOptions(false)}>Resume</button>
            <button className="OptionsDialogButton">Settings</button>
            <button className="OptionsDialogButton">Return to Title</button>
            <button className="OptionsDialogButton">Resources</button>
        </div>

        </>
    )
}

export default OptionsDialog;