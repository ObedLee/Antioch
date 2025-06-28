import firebasedb from "./firebaseApp";  
import {getFirestore} from "firebase/firestore";

const fireStore = getFirestore(firebasedb.firebaseApp);

export default fireStore;