Concurrency Issues


## Current database conditions: 

1. data 
| key  | value    |
| ---- | -------- |
| name | abhishek |
| age  | 42       |


2. multiple transactions can read / write to amy row of the table.



### dirty read

T1 -> reads name (abhishek) -> T2 -> updates name (john) -> T1 -> commits
T2 -> ................................................. reads name (john) (dirty read) -> commits


### dirty write 




Read Committed

Read UnCommitted

Repeatable Read / SnapShot Isolation 

Serializable SnapShot Isolation


