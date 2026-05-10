import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentGroup: null,
    expenses: [],
};

export const groupSlice = createSlice({
    name: 'group',
    initialState,
    reducers: {
        // save the group details
        setGroupData: (state, action) => {
            state.currentGroup = action.payload;
        },
        // save all the bills
        setExpenses: (state, action) => {
            state.expenses = action.payload;
        },
        // add a new bill to the list without refreshing the page
        addExpenseToStore: (state, action) => {
            state.expenses.push(action.payload);
        }
    }
});

export const { setGroupData, setExpenses, addExpenseToStore } = groupSlice.actions;
export default groupSlice.reducer;