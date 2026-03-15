erDiagram
    USERS ||--|| PROFILES : "1:1 via id"
    USERS ||--o{ ACCOUNTS : "possède"
    USERS ||--o{ AMIS : "a pour ami"
    USERS ||--o{ DEMANDES_AMIS : "envoie/reçoit"
    USERS ||--o{ FAMILLE_MEMBERS : "fait partie de"
    USERS ||--o{ FAMILLE_INVITATIONS : "invite/est invité"
    USERS ||--o{ CASH_FLOW_ENTREES : "enregistre"
    USERS ||--o{ CASH_FLOW_SORTIES : "enregistre"
    USERS ||--o{ CASH_TRANSACTIONS : "effectue"
    USERS ||--o{ INVESTMENT_TRANSACTIONS_PEA : "investit"
    USERS ||--o{ INVESTMENT_TRANSACTIONS_CTO : "investit"
    USERS ||--o{ INVESTMENT_TRANSACTIONS_CRYPTO : "investit"
    USERS ||--o{ PATRIMOINE_HISTORY : "historise"
    USERS ||--o{ FEATURE_SUGGESTIONS : "propose"

    PROFILES {
        uuid id PK
        text nom
        text email
        text telephone
        timestamp updated_at
        text avatar_url
        boolean famille
        boolean reseau
        numeric patrimoine_total
    }

    ACCOUNTS {
        uuid id PK
        uuid user_id FK
        integer num_compte
        text nom
        text type
        text fournisseur
        numeric solde
        timestamp date_now
    }

    CASH_TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        text account_type
        text type
        numeric montant
        text description
        date date
    }

    AMIS {
        uuid id PK
        uuid user_id FK
        uuid ami_id FK
    }

    FAMILLE_MEMBERS {
        uuid id PK
        uuid user_id FK
        uuid membre_id FK
        text role
    }

    PATRIMOINE_HISTORY {
        uuid id PK
        uuid user_id FK
        date date
        numeric patrimoine_total
        numeric cash_total
        numeric investissements_total
        numeric biens_total
    }