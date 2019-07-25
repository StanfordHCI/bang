import React from 'react'; 

const style = {
    padding: "0",
    margin: "5px",
    width: "50px",
    borderRadius: "10px",

}
const Reaction = ({isClicked, reactionType, value, clickedIcon, notClickedIcon, handleClick}) => (
    <React.Fragment>
        {isClicked ? 
            <button style={style} onClick={() => handleClick(reactionType)}><i class={clickedIcon}></i> {value}</button>
        :
        <button style={style} onClick={() => handleClick(reactionType)}><i class={notClickedIcon}></i> {value}</button>}
    </React.Fragment>   
)

export default Reaction;